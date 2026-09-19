'use client';

import { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Shield, Info } from 'lucide-react';

// ── Static token data (DeFi-style scanner) ──────────────────────────────────

function pct(v: number) {
  const color = v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#9ca3af';
  const prefix = v > 0 ? '+' : '';
  return <span style={{ color }}>{prefix}{v.toFixed(2)}%</span>;
}

const RISK_COLOR = (r: string) =>
  ({ LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#dc2626' }[r] || '#9ca3af');

const tokens = [
  { id:1, name:'Monkeys',  sym:'MNK',  price:'0.0006595', age:'7h',  txns:96390,  vol:'$7.8M',  makers:28347, m5:-2.45,  h1:-63.42, h6:45.20, h24:1.86,   liq:'$93K',  mcap:'$659K',  risk:'HIGH',     tag:null },
  { id:2, name:'KvK',      sym:'KVK',  price:'0.0009478', age:'15h', txns:80148,  vol:'$8.7M',  makers:12100, m5:10.80,  h1:17.57,  h6:197.0, h24:179.7,  liq:'$114K', mcap:'$947K',  risk:'MEDIUM',   tag:null },
  { id:3, name:'DARK',     sym:'DARK', price:'0.002702',  age:'1d',  txns:96187,  vol:'$15.2M', makers:15357, m5:3.07,   h1:10.34,  h6:-25.53,h24:31.82,  liq:'$209K', mcap:'$2.7M',  risk:'LOW',      tag:null },
  { id:4, name:'SBW',      sym:'SBW',  price:'0.0001095', age:'6h',  txns:43244,  vol:'$3.3M',  makers:7425,  m5:5.79,   h1:-39.43, h6:67.33, h24:121.0,  liq:'$35K',  mcap:'$109K',  risk:'CRITICAL', tag:null },
  { id:5, name:'Figure',   sym:'FIG',  price:'0.005391',  age:'4d',  txns:26323,  vol:'$5.0M',  makers:5492,  m5:4.24,   h1:26.61,  h6:25.86, h24:44.36,  liq:'$281K', mcap:'$5.3M',  risk:'LOW',      tag:null },
  { id:6, name:'titcoin',  sym:'TIT',  price:'0.02889',   age:'29d', txns:19931,  vol:'$5.2M',  makers:5101,  m5:-1.35,  h1:6.62,   h6:-5.70, h24:-17.65, liq:'$1.2M', mcap:'$27.8M', risk:'LOW',      tag:'100' },
  { id:7, name:'WWE',      sym:'WWE',  price:'0.0001927', age:'3h',  txns:141344, vol:'$1.1M',  makers:136108,m5:12.12,  h1:-22.78, h6:292.0, h24:292.0,  liq:'$42K',  mcap:'$192K',  risk:'HIGH',     tag:'300' },
  { id:8, name:'BOUNCE',   sym:'BNC',  price:'0.0006022', age:'19h', txns:35540,  vol:'$2.6M',  makers:5023,  m5:-5.19,  h1:1.22,   h6:117.0, h24:106.9,  liq:'$79K',  mcap:'$602K',  risk:'MEDIUM',   tag:null },
];

type SortKey = 'h24' | 'vol' | 'liq' | 'txns';

export default function TokensPage() {
  const [timeframe, setTimeframe] = useState<'5M'|'1H'|'6H'|'24H'>('24H');
  const [sortBy, setSortBy] = useState<SortKey>('txns');
  const [filter, setFilter] = useState<'Top'|'Gainers'|'NewPairs'>('Top');

  const tfKey: Record<string, 'm5'|'h1'|'h6'|'h24'> = { '5M':'m5','1H':'h1','6H':'h6','24H':'h24' };
  const currentKey = tfKey[timeframe];

  const sorted = [...tokens].sort((a, b) => {
    if (sortBy === 'h24') return b.h24 - a.h24;
    if (sortBy === 'vol') return parseFloat(b.vol.replace(/[$MK,]/g,'')) - parseFloat(a.vol.replace(/[$MK,]/g,''));
    return b.txns - a.txns;
  });

  const filtered = filter === 'Gainers' ? sorted.filter(t => t[currentKey] > 0) : sorted;

  return (
    <main style={{ minHeight: '100vh', background: '#051008', padding: '2rem 2rem 4rem' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Shield style={{ color: '#8ddca4', width: 20, height: 20 }} />
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Token Scanner
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: 0 }}>
            Live market data with Guardiant AI risk scoring on each token
          </p>
        </div>

        {/* ── Controls bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Timeframe selector */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(141,220,164,0.12)',
              borderRadius: 10, display: 'flex', overflow: 'hidden',
            }}>
              {(['5M','1H','6H','24H'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: timeframe === tf ? 'rgba(141,220,164,0.15)' : 'transparent',
                    color: timeframe === tf ? '#8ddca4' : 'rgba(255,255,255,0.4)',
                    border: 'none', transition: 'all 0.15s',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Sort buttons */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(141,220,164,0.12)',
              borderRadius: 10, display: 'flex', overflow: 'hidden',
            }}>
              {([['txns','TXNS'],['vol','VOL'],['h24','24H %']] as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: sortBy === k ? 'rgba(141,220,164,0.15)' : 'transparent',
                    color: sortBy === k ? '#8ddca4' : 'rgba(255,255,255,0.4)',
                    border: 'none', transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Top','Gainers','NewPairs'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#8ddca4' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? '#051008' : 'rgba(255,255,255,0.5)',
                  border: 'none', borderRadius: 50, padding: '7px 16px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {f === 'NewPairs' ? 'New Pairs' : f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(141,220,164,0.1)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(141,220,164,0.04)', borderBottom: '1px solid rgba(141,220,164,0.08)' }}>
                  {['#', 'TOKEN', 'PRICE', 'AGE', 'TXNS', 'VOLUME', 'MAKERS',
                    '5M', '1H', '6H', '24H', 'LIQUIDITY', 'MCAP', 'RISK'].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.3)', textAlign: h === 'TOKEN' || h === '#' ? 'left' : 'right',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const rc = RISK_COLOR(t.risk);
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(141,220,164,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Token avatar */}
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${rc}33, rgba(141,220,164,0.15))`,
                            border: `1px solid ${rc}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 800, color: rc, flexShrink: 0,
                          }}>
                            {t.sym.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                              {t.tag && (
                                <span style={{
                                  background: 'rgba(141,220,164,0.1)', color: '#8ddca4',
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                }}>
                                  {t.tag}
                                </span>
                              )}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{t.sym}/ETH</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'white', fontSize: 14, fontWeight: 600 }}>
                        ${t.price}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                        {t.age}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {t.txns.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {t.vol}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {t.makers.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>{pct(t.m5)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>{pct(t.h1)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>{pct(t.h6)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>{pct(t.h24)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        {t.liq}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        {t.mcap}
                      </td>
                      {/* Risk badge */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{
                          background: `${rc}15`, border: `1px solid ${rc}44`,
                          color: rc, fontSize: 11, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap',
                        }}>
                          {t.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{
          marginTop: 20, display: 'flex', gap: 20, flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(141,220,164,0.08)',
          borderRadius: 12, padding: '14px 20px', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield style={{ color: '#8ddca4', width: 14, height: 14 }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Guardiant Risk Score:</span>
          </div>
          {[['LOW','#22c55e'],['MEDIUM','#eab308'],['HIGH','#f97316'],['CRITICAL','#dc2626']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ color, fontSize: 12, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginLeft: 'auto' }}>
            Powered by Isolation Forest + XGBoost
          </span>
        </div>
      </div>
    </main>
  );
}
