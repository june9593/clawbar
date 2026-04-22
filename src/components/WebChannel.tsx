import { useEffect, useRef } from 'react';
import type { WebChannelDef } from '../types';
import { useChannelStore } from '../stores/channelStore';

interface Props {
  channel: WebChannelDef;
  isActive: boolean;
}

// Electron webview is a custom element — declare it for TS/React.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          allowpopups?: boolean | string;
          useragent?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function WebChannel({ channel, isActive }: Props) {
  const webviewRef = useRef<HTMLElement | null>(null);
  const setIcon = useChannelStore((s) => s.setIcon);

  // Capture favicon updates for user-added channels (so the dock icon
  // stops being 🌐 once the page loads).
  useEffect(() => {
    const el = webviewRef.current;
    if (!el || channel.builtin) return;

    const onFavicon = (e: Event) => {
      const ev = e as Event & { favicons?: string[] };
      const url = ev.favicons?.[0];
      if (url) setIcon(channel.id, url);
    };
    el.addEventListener('page-favicon-updated', onFavicon as EventListener);
    return () => el.removeEventListener('page-favicon-updated', onFavicon as EventListener);
  }, [channel.id, channel.builtin, setIcon]);

  return (
    <webview
      ref={(el) => { webviewRef.current = el; }}
      src={channel.url}
      partition={`persist:channel-${channel.id}`}
      allowpopups={true}
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'flex' : 'none',
        background: 'var(--color-bg-primary)',
      }}
    />
  );
}
