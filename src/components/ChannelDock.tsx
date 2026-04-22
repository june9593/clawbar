import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Channel } from '../types';
import { useChannelStore } from '../stores/channelStore';
import { ChannelIcon } from './ChannelIcon';
import { AddChannelMenu } from './AddChannelMenu';
import { ChannelContextMenu } from './ChannelContextMenu';

export function ChannelDock() {
  const channels = useChannelStore((s) => s.channels);
  const activeId = useChannelStore((s) => s.activeChannelId);
  const setActive = useChannelStore((s) => s.setActive);
  const [adding, setAdding] = useState(false);
  const [ctx, setCtx] = useState<{ channel: Channel; x: number; y: number } | null>(null);

  const visible = channels.filter((c) => c.enabled);

  return (
    <div
      style={{
        width: 48, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 0',
        gap: 6,
        borderRight: '0.5px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {visible.map((c) => (
        <ChannelIcon
          key={c.id}
          channel={c}
          active={c.id === activeId}
          onClick={() => setActive(c.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setCtx({ channel: c, x: e.clientX, y: e.clientY });
          }}
        />
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setAdding((v) => !v)}
        title="Add channel"
        style={{
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: adding ? 'var(--color-surface-active)' : 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { if (!adding) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
        onMouseLeave={(e) => { if (!adding) e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus size={18} strokeWidth={1.75} />
      </button>

      {adding && <AddChannelMenu onClose={() => setAdding(false)} />}
      {ctx && <ChannelContextMenu channel={ctx.channel} x={ctx.x} y={ctx.y} onClose={() => setCtx(null)} />}
    </div>
  );
}
