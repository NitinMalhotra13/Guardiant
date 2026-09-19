'use client';

import { useState } from 'react';
import { FaShieldAlt, FaArrowDown, FaArrowUp, FaExclamationTriangle, FaCheckCircle, FaFilter } from 'react-icons/fa';
import { Connect } from '../../components/wallet/Connect';
import { useTransactionHistory, Transaction } from '../../hooks/useTransactionHistory';
import { useWalletContext } from '../../context/WalletContext';
import Link from 'next/link';

// ── Helpers ────────────────────────────────────────────────────────────────────

const RISK_COLOR = (score: number) => {
  if (score >= 80) return '#dc2626';
  if (score >= 60) return '#f97316';
  if (score >= 35) return '#eab308';
  return '#22c55e';
};

const RISK_LABEL = (score: number) => {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
};

const ANOMALY_ICONS: Record<string, string> = {
  VELOCITY_SPIKE: '⚡',
  LARGE_TRANSFER: '🐋',
  RUG_PULL: '🪤',
  DRAIN_ATTACK: '🕳️',
  LAYERING: '🪆',
  SMURFING: '🎭',
  FLASH_LOAN_PATTERN: '⚙️',
  HONEYPOT_INTERACTION: '🍯',
  NONE: '',
};

function shortAddr(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ color: color || 'white', fontSize: 26, fontWeight: 800, margin: 0 }}>{value}</p>
      {sub && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

function TxRow({ tx, isExpanded, onToggle }: { tx: Transaction; isExpanded: boolean; onToggle: () => void }) {
  const riskScore = tx.riskScore ?? 0;
  const anomaly = tx.anomalyType ?? 'NONE';
  const riskColor = RISK_COLOR(riskScore);
  const hasAnomaly = anomaly !== 'NONE';

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(141,220,164,0.06)',
        background: isExpanded ? 'rgba(141,220,164,0.03)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 16,
        }}
      >
        {/* Direction icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: tx.isIncoming ? 'rgba(34,197,94,0.12)' : 'rgba(96,165,250,0.12)',
          border: `1px solid ${tx.isIncoming ? 'rgba(34,197,94,0.25)' : 'rgba(96,165,250,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {tx.isIncoming
            ? <FaArrowDown style={{ color: '#22c55e', fontSize: 14 }} />
            : <FaArrowUp style={{ color: '#60a5fa', fontSize: 14 }} />}
        </div>

        {/* Direction + address */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
              {tx.isIncoming ? 'Received' : 'Sent'}
            </span>
            {tx.isProtected && (
              <span style={{
                background: 'rgba(141,220,164,0.12)', border: '1px solid rgba(141,220,164,0.3)',
                color: '#8ddca4', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50,
              }}>
                🛡️ Protected
              </span>
            )}
            {hasAnomaly && !tx.isProtected && (
              <span style={{
                background: `${riskColor}15`, border: `1px solid ${riskColor}44`,
                color: riskColor, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50,
              }}>
                {ANOMALY_ICONS[anomaly]} {anomaly.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, fontFamily: 'monospace' }}>
            {tx.isIncoming ? `From: ${shortAddr(tx.from)}` : `To: ${shortAddr(tx.to || '')}`}
          </p>
        </div>

        {/* Risk bar */}
        <div style={{ width: 80, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: riskColor, fontSize: 11, fontWeight: 700 }}>{RISK_LABEL(riskScore)}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{riskScore}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <div style={{
              width: `${riskScore}%`, height: '100%', borderRadius: 2,
              background: riskColor, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Value + time */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>
            {parseFloat(tx.value).toFixed(4)} ETH
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>
            {formatDate(tx.timestamp)}
          </p>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div style={{
          padding: '0 20px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          marginTop: -1,
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16, marginTop: 16,
          }}>
            {[
              ['Transaction Hash', tx.hash, true],
              ['From', tx.from, true],
              ['To', tx.to || 'Contract Creation', true],
              ['Value', `${tx.value} ETH`, false],
              ['Risk Score', `${riskScore} / 100`, false],
              ['Anomaly Type', anomaly.replace(/_/g, ' '), false],
            ].map(([label, val, mono]) => (
              <div key={String(label)}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  {label}
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0,
                  fontFamily: mono ? 'monospace' : 'inherit',
                  wordBreak: 'break-all',
                }}>
                  {String(val)}
                </p>
              </div>
            ))}
          </div>
          <a
            href={`https://etherscan.io/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
              color: '#8ddca4', fontSize: 13, textDecoration: 'none',
              background: 'rgba(141,220,164,0.08)', border: '1px solid rgba(141,220,164,0.2)',
              borderRadius: 8, padding: '6px 14px', transition: 'all 0.15s',
            }}
          >
            View on Etherscan ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'incoming' | 'outgoing' | 'threats';

export default function TransactionsPage() {
  const { isConnected, address } = useWalletContext();
  const { transactions, isLoading, error, isDemo } = useTransactionHistory();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // ── Stats ──
  const totalETH = transactions.reduce((s, t) => s + parseFloat(t.value), 0);
  const threats = transactions.filter(t => (t.riskScore ?? 0) >= 60);
  const protected_ = transactions.filter(t => t.isProtected);

  // ── Filter ──
  const filtered = transactions.filter(tx => {
    if (filter === 'incoming') return tx.isIncoming;
    if (filter === 'outgoing') return !tx.isIncoming;
    if (filter === 'threats') return (tx.riskScore ?? 0) >= 60;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (f: FilterType) => { setFilter(f); setPage(1); setExpanded(null); };

  // ── Not connected ──
  if (!isConnected) {
    return (
      <main style={{
        minHeight: '100vh', background: '#051008',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center',
      }}>
        <FaShieldAlt style={{ color: '#8ddca4', fontSize: 56, marginBottom: 24, opacity: 0.7 }} />
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
          Transaction History
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32, maxWidth: 380 }}>
          Connect your wallet to view your on-chain transaction history with AI risk scoring.
        </p>
        <Connect />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#051008', padding: '2rem 2rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: 0 }}>
            Transaction History
          </h1>
          {isDemo && (
            <span style={{
              background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
              color: '#eab308', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50,
            }}>
              DEMO DATA
            </span>
          )}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>
          {address?.slice(0, 6)}…{address?.slice(-4)} · Last 50 blocks
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Transactions" value={String(transactions.length)} sub="on-chain + demo" />
        <StatCard label="Volume" value={`${totalETH.toFixed(4)} ETH`} />
        <StatCard
          label="Threats Detected"
          value={String(threats.length)}
          color={threats.length > 0 ? '#f97316' : '#22c55e'}
          sub={`${protected_.length} auto-protected`}
        />
        <StatCard
          label="Protection Rate"
          value={threats.length > 0 ? `${Math.round((protected_.length / threats.length) * 100)}%` : '100%'}
          color="#8ddca4"
        />
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          ['all',      'All',      transactions.length],
          ['incoming', 'Incoming', transactions.filter(t => t.isIncoming).length],
          ['outgoing', 'Outgoing', transactions.filter(t => !t.isIncoming).length],
          ['threats',  '⚠️ Threats', threats.length],
        ] as [FilterType, string, number][]).map(([f, label, count]) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            style={{
              background: filter === f ? '#8ddca4' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#051008' : 'rgba(255,255,255,0.6)',
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50, padding: '8px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {label}
            <span style={{
              background: filter === f ? 'rgba(5,16,8,0.2)' : 'rgba(255,255,255,0.1)',
              color: filter === f ? '#051008' : 'rgba(255,255,255,0.5)',
              borderRadius: 50, padding: '1px 7px', fontSize: 11, fontWeight: 700,
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Transaction list ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(141,220,164,0.1)',
        borderRadius: 16, overflow: 'hidden', marginBottom: 24,
      }}>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Loading transactions…
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#f97316' }}>{error.message}</p>
          </div>
        ) : paged.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <FaFilter style={{ fontSize: 28, marginBottom: 12 }} />
            <p>No transactions match this filter.</p>
          </div>
        ) : (
          paged.map(tx => (
            <TxRow
              key={tx.hash}
              tx={tx}
              isExpanded={expanded === tx.hash}
              onToggle={() => setExpanded(prev => prev === tx.hash ? null : tx.hash)}
            />
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
              fontSize: 14, opacity: page === 1 ? 0.4 : 1,
            }}
          >
            ← Prev
          </button>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
              fontSize: 14, opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Demo notice ── */}
      {isDemo && (
        <div style={{
          marginTop: 32, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)',
          borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <FaExclamationTriangle style={{ color: '#eab308', flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
            <strong style={{ color: '#eab308' }}>Demo mode:</strong> No on-chain transactions found for your address.
            Showing synthetic sample data to demonstrate the UI. Send a transaction on{' '}
            <strong style={{ color: 'white' }}>Localhost 8545</strong> to see real data.
          </p>
        </div>
      )}
    </main>
  );
}
