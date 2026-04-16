import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UseClawChat {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function textFrom(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content))
    return content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('');
  return '';
}

/* ------------------------------------------------------------------ */
/*  Hook — thin IPC bridge to main-process WebSocket                   */
/* ------------------------------------------------------------------ */

export function useClawChat(gatewayUrl: string, authToken: string): UseClawChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!gatewayUrl || !window.electronAPI?.ws) return;

    const api = window.electronAPI.ws;

    // Listen for connection status
    cleanups.current.push(
      api.onStatus((status) => {
        setIsConnected(status.connected);
        if (status.error) setError(status.error);
        else if (status.connected) setError(null);
      }),
    );

    // Listen for chat history
    cleanups.current.push(
      api.onHistory((payload) => {
        const p = payload as { messages?: Array<{ role: string; content: unknown; timestamp?: number }> };
        if (p?.messages) {
          setMessages(
            p.messages
              .filter(m => m.role === 'user' || m.role === 'assistant')
              .map((m, i) => ({
                id: `hist-${i}`,
                role: m.role as 'user' | 'assistant',
                content: textFrom(m.content),
                timestamp: m.timestamp
                  ? new Date(m.timestamp).toISOString()
                  : new Date().toISOString(),
              })),
          );
        }
      }),
    );

    // Listen for chat streaming events
    cleanups.current.push(
      api.onChatEvent((payload) => {
        const p = payload as { state?: string; message?: { role?: string; content?: unknown } };
        const state = p.state;
        const msg = p.message;

        if (state === 'delta') {
          setIsTyping(true);
          const text = textFrom(msg?.content);
          if (text) {
            setMessages(prev => {
              const rest = prev.filter(m => m.id !== '__stream__');
              return [...rest, {
                id: '__stream__', role: 'assistant' as const,
                content: text, timestamp: new Date().toISOString(),
              }];
            });
          }
        } else if (state === 'final') {
          const final = textFrom(msg?.content);
          setIsTyping(false);
          if (final) {
            setMessages(prev => {
              const rest = prev.filter(m => m.id !== '__stream__');
              return [...rest, {
                id: `msg-${Date.now()}`, role: 'assistant' as const,
                content: final, timestamp: new Date().toISOString(),
              }];
            });
          }
        }
      }),
    );

    // Connect
    api.connect(gatewayUrl, authToken);

    return () => {
      cleanups.current.forEach(fn => fn());
      cleanups.current = [];
      api.disconnect();
    };
  }, [gatewayUrl, authToken]);

  const sendMessage = useCallback((text: string) => {
    if (!window.electronAPI?.ws) return;

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`, role: 'user' as const,
      content: text, timestamp: new Date().toISOString(),
    }]);
    setIsTyping(true);

    window.electronAPI.ws.send('chat.send', {
      sessionKey: 'main',
      message: text,
      idempotencyKey: crypto.randomUUID(),
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
  }, []);

  return { messages, isConnected, isTyping, sendMessage, clearMessages, error };
}
