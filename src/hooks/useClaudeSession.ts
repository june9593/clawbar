import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Session } from './useClawChat';
import type { ApprovalRequest, ApprovalDecision } from '../components/ApprovalCard';

export interface UseClaudeSession {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  sendMessage: (text: string) => void;
  error: string | null;
  // Stubs to satisfy ChatView's prop shape (Claude MVP doesn't expose these).
  sessions: Session[];
  currentSessionKey: string;
  switchSession: (key: string) => void;
  createSession: () => void;
  deleteSession: (key: string) => void;
  pendingApprovals: ApprovalRequest[];
  resolvedApprovals: ApprovalRequest[];
  resolveApproval: (id: string, decision: ApprovalDecision) => void;
}

export function useClaudeSession(
  channelId: string,
  projectDir: string,
  sessionId: string,
): UseClaudeSession {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spawnedRef = useRef(false);

  useEffect(() => {
    if (!window.electronAPI?.claude || spawnedRef.current) return;
    spawnedRef.current = true;

    const unsub = window.electronAPI.claude.onEvent((payload) => {
      if (payload.channelId !== channelId) return;

      if (payload.type === 'spawned') {
        setIsConnected(true);
        setError(null);
        return;
      }
      if (payload.type === 'exit') {
        setIsConnected(false);
        setIsTyping(false);
        setError(`claude exited (code ${payload.code ?? '?'})`);
        return;
      }
      if (payload.type === 'error') {
        setError((payload.message as unknown as string) ?? 'unknown error');
        setIsTyping(false);
        return;
      }
      // chat events: state==='delta'|'final', message:{role, content}
      const msg = payload.message;
      if (!msg) return;
      if (payload.state === 'delta') {
        setIsTyping(true);
        setMessages((prev) => {
          const previousStream = prev.find((m) => m.id === '__cl_stream__');
          const rest = prev.filter((m) => m.id !== '__cl_stream__');
          return [...rest, {
            id: '__cl_stream__',
            role: msg.role as 'user' | 'assistant',
            content: (previousStream?.content ?? '') + msg.content,
            timestamp: new Date().toISOString(),
          }];
        });
      } else if (payload.state === 'final') {
        if (msg.role === 'user') {
          setMessages((prev) => [...prev, {
            id: `cl-u-${Date.now()}`,
            role: 'user', content: msg.content,
            timestamp: new Date().toISOString(),
          }]);
        } else {
          setIsTyping(false);
          setMessages((prev) => {
            const rest = prev.filter((m) => m.id !== '__cl_stream__');
            return [...rest, {
              id: `cl-a-${Date.now()}`,
              role: 'assistant', content: msg.content,
              timestamp: new Date().toISOString(),
            }];
          });
        }
      }
    });

    window.electronAPI.claude.spawn(channelId, projectDir, sessionId).catch((e: Error) => {
      setError(`spawn failed: ${e.message}`);
    });

    return () => {
      unsub();
      // Note: we do NOT kill the child here — the channel may just be inactive
      // while the user switches around. `channelStore.remove` kills it on
      // explicit deletion. App quit kills all via before-quit.
    };
  }, [channelId, projectDir, sessionId]);

  const sendMessage = (text: string) => {
    if (!window.electronAPI?.claude) return;
    setIsTyping(true);
    window.electronAPI.claude.send(channelId, text).catch((e: Error) => {
      setError(`send failed: ${e.message}`);
    });
  };

  return {
    messages, isConnected, isTyping, sendMessage, error,
    sessions: [], currentSessionKey: '',
    switchSession: () => {},
    createSession: () => {},
    deleteSession: () => {},
    pendingApprovals: [],
    resolvedApprovals: [],
    resolveApproval: () => {},
  };
}
