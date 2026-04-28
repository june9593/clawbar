import { ipcMain, BrowserWindow } from 'electron';
import { query, type Query, type CanUseTool, type PermissionMode } from '@anthropic-ai/claude-agent-sdk';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { MessageQueue } from './claude-message-queue';
import type { ClaudeEvent, ApprovalDecision, AskQuestion } from '../shared/claude-events';

interface PendingApproval {
  resolve: (decision: ApprovalDecision) => void;
}

interface PendingAsk {
  resolve: (answers: string[][]) => void;
}

interface ActiveSession {
  channelId: string;
  projectDir: string;
  projectKey: string;
  /** Last known SDK session id; populated from the SDK's `init` message and
   *  reused as `resume` after an idle close. */
  sessionId: string | null;
  /** Path to the user's `claude` binary, resolved at start time. */
  cliPath: string;
  /** Live SDK Query, or null while we're between idle close and next message. */
  q: Query | null;
  /** Queue we push user messages into for the live Query. */
  queue: MessageQueue | null;
  /** Per-channel abort controller. Aborted on user Stop or close. */
  abortController: AbortController;
  /** Tools the user has allowed for the rest of this in-memory session. */
  allowedForSession: Set<string>;
  /** Pending approval requests indexed by requestId. */
  pendingApprovals: Map<string, PendingApproval>;
  /** Pending AskUserQuestion requests indexed by requestId. */
  pendingAsks: Map<string, PendingAsk>;
  /** Last activity timestamp; idle timer compares against this. */
  lastActivityAt: number;
  /** Idle close timer handle. */
  idleTimer: NodeJS.Timeout | null;
}

const sessions = new Map<string, ActiveSession>();
const IDLE_CLOSE_MS = 30 * 60 * 1000; // 30 minutes

function sendToRenderer(channelEvent: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(channelEvent, payload);
  }
}

function emit(channelId: string, event: ClaudeEvent) {
  sendToRenderer('claude:event', { channelId, event });
}

function bumpActivity(s: ActiveSession) {
  s.lastActivityAt = Date.now();
  if (s.idleTimer) clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(() => closeQuery(s), IDLE_CLOSE_MS);
}

/** Tear down the live Query but KEEP the ActiveSession record so the next
 *  user message reopens with `resume: sessionId`. The renderer needs no
 *  explicit signal here — the next user message produces a fresh
 *  `session-started` event. */
function closeQuery(s: ActiveSession) {
  try { s.queue?.close(); } catch { /* ignore */ }
  try { s.q?.interrupt?.(); } catch { /* ignore */ }
  s.queue = null;
  s.q = null;
  // Reset abort controller for the next Query.
  s.abortController = new AbortController();
  // Drop any unresolved approval / ask resolvers — the renderer's UI is
  // already stale at this point because the turn unwound.
  for (const a of s.pendingApprovals.values()) a.resolve('deny');
  for (const a of s.pendingAsks.values()) a.resolve([]);
  s.pendingApprovals.clear();
  s.pendingAsks.clear();
  if (s.idleTimer) { clearTimeout(s.idleTimer); s.idleTimer = null; }
}

/** Tear down the session entirely — removes it from the map. */
function destroySession(channelId: string) {
  const s = sessions.get(channelId);
  if (!s) return;
  closeQuery(s);
  s.abortController.abort();
  sessions.delete(channelId);
}

/** Build the `canUseTool` callback for this session (filled in by Task 9). */
function makeCanUseTool(_s: ActiveSession): CanUseTool {
  return async (_toolName, input, _options) => {
    return { behavior: 'allow', updatedInput: input as Record<string, unknown> };
  };
}

type AnyMsg = Record<string, unknown> & { type: string };

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  // for tool_result blocks (user messages):
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

/** Track tool-call start times so tool-result can compute duration. */
function makeToolStartTracker() {
  const starts = new Map<string, number>();
  return {
    record(id: string) { starts.set(id, Date.now()); },
    take(id: string): number {
      const t = starts.get(id);
      starts.delete(id);
      return t ?? Date.now();
    },
  };
}

async function runSession(s: ActiveSession, q: Query): Promise<void> {
  const tracker = makeToolStartTracker();
  try {
    for await (const raw of q as AsyncIterable<AnyMsg>) {
      const msg = raw as AnyMsg;
      bumpActivity(s);

      // ── system init: capture sessionId for future resume ──────────────
      if (msg.type === 'system' && (msg as AnyMsg).subtype === 'init') {
        const newId = msg.session_id as string | undefined;
        if (newId) {
          s.sessionId = newId;
          emit(s.channelId, { kind: 'session-started', sessionId: newId });
        }
        continue;
      }

      // ── stream_event: deltas (text + thinking) ────────────────────────
      if (msg.type === 'stream_event') {
        const inner = msg.event as { type?: string; delta?: { type?: string; text?: string; thinking?: string } } | undefined;
        if (!inner) continue;
        if (inner.type === 'content_block_delta') {
          const d = inner.delta;
          if (d?.type === 'text_delta' && typeof d.text === 'string' && d.text.length > 0) {
            emit(s.channelId, {
              kind: 'message-delta',
              messageId: (msg.parent_tool_use_id as string | null) ?? 'live',
              text: d.text,
            });
          } else if (d?.type === 'thinking_delta' && typeof d.thinking === 'string' && d.thinking.length > 0) {
            emit(s.channelId, {
              kind: 'thinking-delta',
              messageId: (msg.parent_tool_use_id as string | null) ?? 'live',
              text: d.thinking,
            });
          }
        }
        continue;
      }

      // ── assistant: complete blocks (text + tool_use) ──────────────────
      if (msg.type === 'assistant') {
        const m = msg.message as { id?: string; content?: ContentBlock[] } | undefined;
        if (!m || !Array.isArray(m.content)) continue;
        for (const block of m.content) {
          if (block.type === 'tool_use' && typeof block.id === 'string') {
            tracker.record(block.id);
            emit(s.channelId, {
              kind: 'tool-call',
              callId: block.id,
              tool: block.name ?? 'unknown',
              input: block.input,
              startedAt: Date.now(),
            });
          }
          // text blocks are already streamed via stream_event deltas; the
          // final assistant message arrives at result-time as a single
          // consolidation. We don't double-emit here — useClaudeSession
          // commits the streaming buffer on `turn-end`.
        }
        continue;
      }

      // ── user: tool_result blocks ──────────────────────────────────────
      if (msg.type === 'user') {
        const m = msg.message as { content?: ContentBlock[] } | undefined;
        if (!m || !Array.isArray(m.content)) continue;
        for (const block of m.content) {
          if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
            const startedAt = tracker.take(block.tool_use_id);
            emit(s.channelId, {
              kind: 'tool-result',
              callId: block.tool_use_id,
              output: block.content,
              isError: block.is_error === true,
              durationMs: Date.now() - startedAt,
            });
          }
        }
        continue;
      }

      // ── result: turn finished ─────────────────────────────────────────
      if (msg.type === 'result') {
        const usage = msg.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        emit(s.channelId, {
          kind: 'turn-end',
          messageId: 'live',
          usage: {
            input: usage?.input_tokens ?? 0,
            output: usage?.output_tokens ?? 0,
          },
        });
        continue;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // SDK throws AbortError when the user aborted — surface as `aborted`,
    // not as a hard error.
    if (message.includes('Abort') || message.includes('abort')) {
      emit(s.channelId, { kind: 'aborted' });
    } else {
      emit(s.channelId, { kind: 'error', message, recoverable: true });
    }
  }
}

/** Open a new SDK Query for this session, resuming if we have a sessionId. */
function openQuery(s: ActiveSession): void {
  const queue = new MessageQueue();
  const permissionMode: PermissionMode = 'default';
  const q = query({
    prompt: queue,
    options: {
      cwd: s.projectDir,
      pathToClaudeCodeExecutable: s.cliPath,
      permissionMode,
      includePartialMessages: true,
      abortController: s.abortController,
      canUseTool: makeCanUseTool(s),
      ...(s.sessionId ? { resume: s.sessionId } : {}),
    },
  });
  s.queue = queue;
  s.q = q;
  // Fire-and-forget — but defensively catch any throw runSession misses,
  // because an unhandled promise rejection on Node 15+ kills the main
  // process by default. Surface as an error event the renderer can show.
  runSession(s, q).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    emit(s.channelId, { kind: 'error', message, recoverable: true });
  });
  bumpActivity(s);
}

async function startSession(
  channelId: string,
  projectDir: string,
  projectKey: string,
  sessionId: string | null,
  cliPath: string,
): Promise<void> {
  // If a session for this channel already exists, destroy it first (e.g. user
  // switched the underlying Claude session via the dropdown).
  destroySession(channelId);

  const s: ActiveSession = {
    channelId,
    projectDir,
    projectKey,
    sessionId,
    cliPath,
    q: null,
    queue: null,
    abortController: new AbortController(),
    allowedForSession: new Set<string>(),
    pendingApprovals: new Map(),
    pendingAsks: new Map(),
    lastActivityAt: Date.now(),
    idleTimer: null,
  };
  sessions.set(channelId, s);
  // Don't open the Query until the user sends the first message — saves
  // spinning up the SDK for channels the user only mounted to read history.
  emit(channelId, { kind: 'cli-found', path: cliPath, version: '' });
}

function sendMessage(channelId: string, text: string): void {
  const s = sessions.get(channelId);
  if (!s) {
    emit(channelId, { kind: 'error', message: 'channel not registered', recoverable: false });
    return;
  }
  if (!s.q || !s.queue) {
    // Lazy-open or reopen after idle close.
    openQuery(s);
  }
  if (!s.queue) {
    emit(channelId, { kind: 'error', message: 'failed to open query', recoverable: true });
    return;
  }
  s.queue.push(text);
  bumpActivity(s);
}

function abortTurn(channelId: string): void {
  const s = sessions.get(channelId);
  if (!s || !s.q) return;
  s.abortController.abort();
  // Replace the controller so the next turn has a fresh signal.
  s.abortController = new AbortController();
  emit(channelId, { kind: 'aborted' });
}

function approve(channelId: string, requestId: string, decision: ApprovalDecision): void {
  const s = sessions.get(channelId);
  if (!s) return;
  const p = s.pendingApprovals.get(requestId);
  if (!p) return;
  s.pendingApprovals.delete(requestId);
  p.resolve(decision);
}

function answerAsk(channelId: string, requestId: string, answers: string[][]): void {
  const s = sessions.get(channelId);
  if (!s) return;
  const p = s.pendingAsks.get(requestId);
  if (!p) return;
  s.pendingAsks.delete(requestId);
  p.resolve(answers);
}

export function killAllClaudeChannels(): void {
  for (const channelId of Array.from(sessions.keys())) destroySession(channelId);
}

// ─── disk history loader (unchanged from previous implementation) ──────────

async function loadHistory(projectKey: string, sessionId: string): Promise<Array<{
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}>> {
  const filePath = path.join(os.homedir(), '.claude', 'projects', projectKey, `${sessionId}.jsonl`);
  if (!fs.existsSync(filePath)) return [];
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const turns: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
    rl.on('line', (line) => {
      let obj: Record<string, unknown>;
      try { obj = JSON.parse(line); } catch { return; }
      const t = obj.type as string | undefined;
      const ts = typeof obj.timestamp === 'string' ? Date.parse(obj.timestamp as string) : Date.now();

      if (t === 'user') {
        if (obj.isMeta) return;
        const m = obj.message as { content?: unknown } | undefined;
        if (!m) return;
        let content = '';
        if (typeof m.content === 'string') content = m.content;
        else if (Array.isArray(m.content)) {
          content = m.content
            .filter((p: { type?: string }) => p.type === 'text')
            .map((p: { text?: string }) => p.text ?? '')
            .join('');
        }
        const trimmed = content.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('<local-command-caveat>')) return;
        if (trimmed.startsWith('<command-output>')) return;
        if (trimmed.startsWith('<command-name>')) {
          const m2 = /<command-name>([^<]+)<\/command-name>/.exec(trimmed);
          const slash = m2 ? m2[1] : trimmed;
          turns.push({ role: 'user', content: slash, timestamp: ts || Date.now() });
          return;
        }
        if (trimmed === 'Continue from where you left off.') return;
        turns.push({ role: 'user', content: trimmed, timestamp: ts || Date.now() });
        return;
      }

      if (t === 'assistant') {
        const m = obj.message as { content?: unknown } | undefined;
        if (!m || !Array.isArray(m.content)) return;
        const content = m.content
          .filter((p: { type?: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text ?? '')
          .join('');
        if (content) {
          turns.push({ role: 'assistant', content, timestamp: ts || Date.now() });
        }
        return;
      }

      if (t === 'system' && obj.subtype === 'local_command') {
        const raw = typeof obj.content === 'string' ? (obj.content as string) : '';
        const inner = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(raw);
        const text = (inner ? inner[1] : raw).trim();
        if (text) {
          turns.push({ role: 'assistant', content: text, timestamp: ts || Date.now() });
        }
        return;
      }
    });
    rl.on('close', () => resolve(turns));
    stream.on('error', () => resolve(turns));
  });
}

// Mark loadHistory used so tsc doesn't strip it (registered as IPC below).
void loadHistory;

// ─── IPC wiring ────────────────────────────────────────────────────────────

export function setupClaudeBridge(): void {
  ipcMain.handle('claude:start', async (
    _e,
    channelId: string,
    projectDir: string,
    projectKey: string,
    sessionId: string | null,
    cliPath: string,
  ) => {
    await startSession(channelId, projectDir, projectKey, sessionId, cliPath);
  });

  ipcMain.handle('claude:send', (_e, channelId: string, text: string) => {
    sendMessage(channelId, text);
  });

  ipcMain.handle('claude:abort', (_e, channelId: string) => {
    abortTurn(channelId);
  });

  ipcMain.handle('claude:close', (_e, channelId: string) => {
    destroySession(channelId);
  });

  ipcMain.handle('claude:approve', (_e, channelId: string, requestId: string, decision: ApprovalDecision) => {
    approve(channelId, requestId, decision);
  });

  ipcMain.handle('claude:answer', (_e, channelId: string, requestId: string, answers: string[][]) => {
    answerAsk(channelId, requestId, answers);
  });

  ipcMain.handle('claude:load-history', async (_e, projectKey: string, sessionId: string) => {
    return loadHistory(projectKey, sessionId);
  });
}
