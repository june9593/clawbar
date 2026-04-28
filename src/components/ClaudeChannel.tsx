import { ChatView } from './ChatView';
import { useClaudeSession } from '../hooks/useClaudeSession';
import type { ClaudeChannelDef } from '../types';

interface Props {
  channel: ClaudeChannelDef;
  isActive: boolean;
}

// Claude brand sparkle — used as the assistant avatar inside the chat.
function ClaudeSparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="#cc785c" aria-hidden="true">
      <path d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z" />
    </svg>
  );
}

export function ClaudeChannel({ channel, isActive }: Props) {
  const chat = useClaudeSession(channel.id, channel.projectDir, channel.sessionId, channel.projectKey);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      visibility: isActive ? 'visible' : 'hidden',
      pointerEvents: isActive ? 'auto' : 'none',
      zIndex: isActive ? 1 : 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <ChatView
        messages={chat.messages}
        isConnected={chat.isConnected}
        isTyping={chat.isTyping}
        sendMessage={chat.sendMessage}
        sessions={chat.sessions}
        currentSessionKey={chat.currentSessionKey}
        switchSession={chat.switchSession}
        createSession={chat.createSession}
        deleteSession={chat.deleteSession}
        pendingApprovals={chat.pendingApprovals}
        resolveApproval={chat.resolveApproval}
        assistantAvatar={<ClaudeSparkle size={16} />}
        emptyStateGlyph={<ClaudeSparkle size={36} />}
      />
    </div>
  );
}
