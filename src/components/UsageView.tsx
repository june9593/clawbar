import { useState, useEffect, useCallback, useRef } from 'react';

interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  missingCostEntries: number;
}

interface UsageData {
  updatedAt: number;
  days: number;
  totals: UsageTotals;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function UsageView() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef<string | null>(null);

  const fetchUsage = useCallback(() => {
    setLoading(true);
    window.electronAPI.ws.send('usage.cost', {}).then(({ ok, id }) => {
      if (ok && id) reqIdRef.current = id;
    });
  }, []);

  useEffect(() => {
    fetchUsage();

    const unsub = window.electronAPI.ws.onResponse((resp) => {
      if (resp.id === reqIdRef.current && resp.ok && resp.payload) {
        setData(resp.payload as UsageData);
        setLoading(false);
        reqIdRef.current = null;
      }
    });

    return unsub;
  }, [fetchUsage]);

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
        }}>
          Usage
        </span>
        {data && (
          <span style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-sans)',
          }}>
            Updated {timeAgo(data.updatedAt)}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
        }}>
          Loading usage data…
        </div>
      ) : data ? (
        <>
          {/* Total cost + tokens cards */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <StatCard label="Total Cost" value={formatCost(data.totals.totalCost)} />
            <StatCard label="Total Tokens" value={formatTokens(data.totals.totalTokens)} />
          </div>

          {/* Breakdown */}
          <div style={{
            background: 'var(--color-surface-card)',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <span style={{
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.3px',
            }}>
              Token Breakdown
            </span>
            <BreakdownRow label="Input" tokens={data.totals.input} cost={data.totals.inputCost} />
            <BreakdownRow label="Output" tokens={data.totals.output} cost={data.totals.outputCost} />
            <BreakdownRow label="Cache Read" tokens={data.totals.cacheRead} cost={data.totals.cacheReadCost} />
            <BreakdownRow label="Cache Write" tokens={data.totals.cacheWrite} cost={data.totals.cacheWriteCost} />
          </div>

          {/* Period info */}
          <span style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
          }}>
            Last {data.days} days
          </span>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
        }}>
          Failed to load usage data
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--color-surface-card)',
      border: '0.5px solid var(--color-border-secondary)',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{
        fontSize: '12px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-tertiary)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '20px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        lineHeight: 1.2,
      }}>
        {value}
      </span>
    </div>
  );
}

function BreakdownRow({ label, tokens, cost }: { label: string; tokens: number; cost: number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontSize: '12px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-secondary)',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
        <span style={{
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-primary)',
        }}>
          {formatTokens(tokens)}
        </span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-tertiary)',
          minWidth: '48px',
          textAlign: 'right',
        }}>
          {formatCost(cost)}
        </span>
      </div>
    </div>
  );
}
