import { useState } from 'react';

export interface ApprovalRequest {
  requestId: string;
  agentId: string;
  tool: string;
  args: Record<string, unknown>;
  description?: string;
}

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onResolve: (requestId: string, decision: 'allow' | 'deny') => void;
}

export function ApprovalCard({ approval, onResolve }: ApprovalCardProps) {
  const [resolving, setResolving] = useState<'allow' | 'deny' | null>(null);

  const handleResolve = (decision: 'allow' | 'deny') => {
    setResolving(decision);
    onResolve(approval.requestId, decision);
  };

  const argsSummary = Object.entries(approval.args)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');

  return (
    <div style={{
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border-primary)',
      borderLeft: '3px solid var(--color-accent)',
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      opacity: resolving ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Header: agent + label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.33,
        }}>
          {approval.agentId}
        </span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.33,
        }}>
          · approval required
        </span>
      </div>

      {/* Tool + args */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <code style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
          wordBreak: 'break-all',
        }}>
          {approval.tool}
        </code>
        {argsSummary && (
          <span style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          }}>
            {argsSummary}
          </span>
        )}
        {approval.description && (
          <span style={{
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
          }}>
            {approval.description}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '2px',
      }}>
        <button
          onClick={() => handleResolve('allow')}
          disabled={resolving !== null}
          style={{
            padding: '5px 16px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--color-accent)',
            color: 'var(--color-bubble-user-text)',
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            cursor: resolving ? 'default' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {resolving === 'allow' ? 'Allowing…' : 'Allow'}
        </button>
        <button
          onClick={() => handleResolve('deny')}
          disabled={resolving !== null}
          style={{
            padding: '5px 16px',
            borderRadius: '6px',
            border: '1px solid var(--color-border-primary)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            cursor: resolving ? 'default' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {resolving === 'deny' ? 'Denying…' : 'Deny'}
        </button>
      </div>
    </div>
  );
}
