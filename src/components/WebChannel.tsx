import { useEffect, useRef } from 'react';
import type { WebChannelDef } from '../types';
import { useChannelStore } from '../stores/channelStore';

interface Props {
  channel: WebChannelDef;
  isActive: boolean;
}

// Electron webview is a custom element — declare it minimally for TS/React.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function WebChannel({ channel, isActive }: Props) {
  const webviewRef = useRef<HTMLElement | null>(null);
  const setIcon = useChannelStore((s) => s.setIcon);

  // Set boolean / non-React-typed attributes imperatively on mount.
  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;
    el.setAttribute('allowpopups', '');
    // Pretend to be a mobile browser so IM web apps return their phone
    // layout — much easier to read inside a narrow menu-bar window.
    el.setAttribute(
      'useragent',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    );
  }, []);

  // Capture favicon updates for user-added channels.
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
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'flex' : 'none',
        background: 'var(--color-bg-primary)',
      }}
    />
  );
}
