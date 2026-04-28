import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, Session } from './useClawChat';
import type { ClaudeEvent, ClaudeEventEnvelope, ApprovalDecision, AskQuestion } from '../../shared/claude-events';
import { useChannelStore } from '../stores/channelStore';

export interface PendingApproval {
  requestId: string;
  tool: string;
  input: unknown;
}

export interface PendingAsk {
  requestId: string;
  questions: AskQuestion[];
}

export interface UseClaudeSession {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  sendMessage: (text: string) => void;
  error: string | null;
  cliMissing: boolean;
  recheckCli: () => void;
  pendingApproval: PendingApproval | null;
  pendingAsk: PendingAsk | null;
  approve: (decision: ApprovalDecision) => void;
  answer: (answers: string[][]) => void;
  /** Slash commands (Claude side keeps the Sprint 1 surface for autocomplete). */
  availableCommands: string[];
  sessions: Session[];
  currentSessionKey: string;
  switchSession: (key: string) => void;
  createSession: () => void;
  deleteSession: (key: string) => void;
  /** Stop button — calls bridge `abort`. */
  abort: () => void;
}

const STREAM_ID = '__cl_stream__';
const THINK_ID = '__cl_thinking__';

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function useClaudeSession(
  channelId: string,
  projectDir: string,
  sessionId: string,
  projectKey: string,
): UseClaudeSession {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cliMissing, setCliMissing] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingAsk, setPendingAsk] = useState<PendingAsk | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableCommands] = useState<string[]>([]); // SDK doesn't surface init slash commands; left empty for now
  const cliPathRef = useRef<string | null>(null);
  const initRef = useRef(false);

  const switchClaudeSession = useChannelStore((s) => s.switchClaudeSession);

  // ── Sibling sessions for the dropdown (unchanged behaviour) ──────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.electronAPI?.claude) return;
      const list = await window.electronAPI.claude.listSessions(projectKey).catch(() => []);
      if (cancelled) return;
      const mapped: Session[] = list.map((s) => ({
        key: s.sessionId,
        displayName: s.preview || '(empty session)',
        updatedAt: relativeTime(s.mtime),
      }));
      if (!mapped.find((m) => m.key === sessionId)) {
        mapped.unshift({ key: sessionId, displayName: 'New session', updatedAt: 'now' });
      }
      setSessions(mapped);
    })();
    return () => { cancelled = true; };
  }, [projectKey, sessionId]);

  const recheckCli = useCallback(() => {
    if (!window.electronAPI?.claude) return;
    setError(null);
    setCliMissing(false);
    initRef.current = false; // allow the init effect to re-run
    // Force the init effect to re-run by toggling a dep — easiest: reset and
    // let parent re-render. Since parent doesn't re-render on its own, do
    // the rebound work inline:
    window.electronAPI.claude.checkCli().then((r) => {
      if (!r.found || !r.path) {
        setCliMissing(true);
        return;
      }
      cliPathRef.current = r.path;
      window.electronAPI.claude.start(channelId, projectDir, projectKey, sessionId, r.path).catch((e: Error) => {
        setError(`start failed: ${e.message}`);
      });
    });
  }, [channelId, projectDir, projectKey, sessionId]);

  // ── Init: load history, check CLI, start session, subscribe to events ──
  useEffect(() => {
    if (!window.electronAPI?.claude || initRef.current) return;
    initRef.current = true;

    // Load .jsonl history for instant context.
    window.electronAPI.claude.loadHistory(projectKey, sessionId).then((turns) => {
      const seeded: ChatMessage[] = turns.map((t, i) => ({
        id: `cl-h-${i}`,
        role: t.role,
        content: t.content,
        timestamp: new Date(t.timestamp).toISOString(),
      }));
      setMessages(seeded);
    }).catch(() => { /* non-fatal */ });

    // Subscribe FIRST so we don't miss events from start().
    const unsub = window.electronAPI.claude.onEvent((envelope: ClaudeEventEnvelope) => {
      if (envelope.channelId !== channelId) return;
      handleEvent(envelope.event);
    });

    // Check CLI then start.
    window.electronAPI.claude.checkCli().then((r) => {
      if (!r.found || !r.path) {
        setCliMissing(true);
        return;
      }
      cliPathRef.current = r.path;
      window.electronAPI.claude.start(channelId, projectDir, projectKey, sessionId, r.path).catch((e: Error) => {
        setError(`start failed: ${e.message}`);
      });
    });

    function handleEvent(ev: ClaudeEvent) {
      switch (ev.kind) {
        case 'cli-missing':
          setCliMissing(true);
          return;
        case 'cli-found':
          setIsConnected(true);
          setError(null);
          return;
        case 'session-started':
          setIsConnected(true);
          return;
        case 'message-delta':
          setIsTyping(true);
          setMessages((prev) => {
            const stream = prev.find((m) => m.id === STREAM_ID);
            const rest = prev.filter((m) => m.id !== STREAM_ID);
            return [...rest, {
              id: STREAM_ID,
              role: 'assistant',
              content: (stream?.content ?? '') + ev.text,
              timestamp: new Date().toISOString(),
            }];
          });
          return;
        case 'thinking-delta':
          setIsTyping(true);
          setMessages((prev) => {
            const think = prev.find((m) => m.id === THINK_ID);
            const rest = prev.filter((m) => m.id !== THINK_ID);
            return [...rest, {
              id: THINK_ID,
              role: 'assistant',
              content: (think?.content ?? '') + ev.text,
              timestamp: new Date().toISOString(),
            }];
          });
          return;
        case 'tool-call':
          setMessages((prev) => [...prev, {
            id: `cl-t-${ev.callId}`,
            role: 'tool',
            content: '',
            timestamp: new Date(ev.startedAt).toISOString(),
            tool: {
              callId: ev.callId,
              name: ev.tool,
              input: ev.input,
              startedAt: ev.startedAt,
            },
          }]);
          return;
        case 'tool-result':
          setMessages((prev) => prev.map((m) => {
            if (m.role !== 'tool' || m.tool?.callId !== ev.callId) return m;
            return {
              ...m,
              tool: {
                ...m.tool!,
                output: ev.output,
                isError: ev.isError,
                durationMs: ev.durationMs,
              },
            };
          }));
          return;
        case 'turn-end':
          setIsTyping(false);
          // Promote the streaming bubble to a stable message, drop thinking.
          setMessages((prev) => {
            const stream = prev.find((m) => m.id === STREAM_ID);
            const rest = prev.filter((m) => m.id !== STREAM_ID && m.id !== THINK_ID);
            if (!stream || !stream.content.trim()) return rest;
            return [...rest, {
              id: `cl-a-${Date.now()}`,
              role: 'assistant',
              content: stream.content,
              timestamp: new Date().toISOString(),
            }];
          });
          return;
        case 'approval-request':
          setPendingApproval({ requestId: ev.requestId, tool: ev.tool, input: ev.input });
          return;
        case 'ask-question':
          setPendingAsk({ requestId: ev.requestId, questions: ev.questions });
          return;
        case 'aborted':
          setIsTyping(false);
          setPendingApproval(null);
          setPendingAsk(null);
          // Drop streaming partial; surface a system-style line.
          setMessages((prev) => {
            const rest = prev.filter((m) => m.id !== STREAM_ID && m.id !== THINK_ID);
            return [...rest, {
              id: `cl-x-${Date.now()}`,
              role: 'assistant',
              content: '[Stopped by user]',
              timestamp: new Date().toISOString(),
            }];
          });
          return;
        case 'error':
          setError(ev.message);
          setIsTyping(false);
          return;
      }
    }

    return () => {
      unsub();
      // Tear down the SDK Query so we don't leak processes between unmounts
      // (e.g. user removes the channel).
      window.electronAPI.claude.close(channelId).catch(() => { /* ignore */ });
    };
  }, [channelId, projectDir, projectKey, sessionId]);

  const sendMessage = (text: string) => {
    if (!window.electronAPI?.claude) return;
    setIsTyping(true);
    setMessages((prev) => [...prev, {
      id: `cl-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }]);
    window.electronAPI.claude.send(channelId, text).catch((e: Error) => {
      setError(`send failed: ${e.message}`);
      setIsTyping(false);
    });
  };

  const abort = () => {
    if (!window.electronAPI?.claude) return;
    window.electronAPI.claude.abort(channelId).catch(() => { /* ignore */ });
  };

  const approve = (decision: ApprovalDecision) => {
    const p = pendingApproval;
    if (!p || !window.electronAPI?.claude) return;
    setPendingApproval(null);
    window.electronAPI.claude.approve(channelId, p.requestId, decision).catch(() => { /* ignore */ });
  };

  const answer = (answers: string[][]) => {
    const p = pendingAsk;
    if (!p || !window.electronAPI?.claude) return;
    setPendingAsk(null);
    window.electronAPI.claude.answer(channelId, p.requestId, answers).catch(() => { /* ignore */ });
  };

  const switchSession = (newSessionId: string) => {
    if (newSessionId === sessionId) return;
    const found = sessions.find((s) => s.key === newSessionId);
    switchClaudeSession(channelId, newSessionId, found?.displayName ?? '');
  };

  const createSession = () => {
    const newId = crypto.randomUUID();
    switchClaudeSession(channelId, newId, '');
  };

  return {
    messages, isConnected, isTyping, sendMessage, error,
    cliMissing, recheckCli,
    pendingApproval, pendingAsk, approve, answer,
    availableCommands,
    sessions,
    currentSessionKey: sessionId,
    switchSession, createSession,
    deleteSession: () => {},
    abort,
  };
}
