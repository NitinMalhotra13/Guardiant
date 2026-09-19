'use client';
import { useState } from 'react';
import { FaShieldAlt, FaCheck, FaUsers, FaWallet, FaBuilding, FaChartLine } from 'react-icons/fa';
import { Connect } from '../../components/wallet/Connect';

/**
 * Pricing model: volume discount — more wallets = lower per-wallet price.
 * Price/wallet: $25 → $22 → $20 → $18 → $15
 */
const BASE_PRICE = 25; // per wallet at Tier 1
const DISCOUNTS  = [0, 12, 20, 28, 40]; // % off per tier

const TIERS = [
  {
    id: 1, name: 'Individual', price: 50,  wallets: 2,  perWallet: 25.0, discount: 0,
    color: '#8ddca4', icon: <FaWallet />,
    tagline: 'Hot wallet + cold storage',
    useCase: 'Personal traders, DeFi users',
    realWorldWallets: ['🔥 Hot Wallet (daily trading)', '🧊 Cold Storage (long-term holds)'],
    features: ['2 wallets monitored', 'Real-time anomaly alerts', 'Spending cap control', 'Emergency kill switch', 'Basic dashboard'],
  },
  {
    id: 2, name: 'Startup', price: 88,  wallets: 4,  perWallet: 22.0, discount: 12,
    color: '#60a5fa', icon: <FaUsers />,
    tagline: 'Team trading accounts',
    useCase: 'Crypto startups, small funds',
    realWorldWallets: ['👤 Founder wallet A', '👤 Founder wallet B', '💼 Operations wallet', '🏦 Treasury wallet'],
    features: ['4 wallets monitored', 'Cross-wallet anomaly correlation', 'Velocity & drain detection', 'API access', 'Anomaly history log'],
  },
  {
    id: 3, name: 'Business', price: 120, wallets: 6,  perWallet: 20.0, discount: 20,
    color: '#c084fc', icon: <FaBuilding />, popular: true,
    tagline: 'DeFi protocol operations',
    useCase: 'DeFi protocols, DAOs, hedge funds',
    realWorldWallets: ['🏛️ DAO Treasury', '⚙️ Protocol Operations', '🔐 Multi-sig Wallet A', '🔐 Multi-sig Wallet B', '📊 Liquidity Manager', '🛡️ Emergency Reserve'],
    features: ['6 wallets monitored', 'Custom risk thresholds per wallet', 'Multi-sig pattern detection', 'Webhook + email alerts', 'Priority ML scanning', 'Export compliance reports'],
  },
  {
    id: 4, name: 'Agency', price: 180, wallets: 10, perWallet: 18.0, discount: 28,
    color: '#f59e0b', icon: <FaChartLine />,
    tagline: 'Client portfolio management',
    useCase: 'Crypto agencies, family offices, exchanges',
    realWorldWallets: ['👥 Client portfolios (×4 pairs)', '🏦 Custodial reserve', '⚡ Hot wallet (withdrawals)', '📋 Compliance wallet', '🔒 Cold reserve'],
    features: ['10 wallets monitored', 'Client-level isolation', 'Layering & smurfing detection', 'Regulatory reporting dashboard', 'Dedicated account manager', 'SLA: 99.9% uptime'],
  },
  {
    id: 5, name: 'Enterprise', price: 300, wallets: 20, perWallet: 15.0, discount: 40,
    color: '#f43f5e', icon: <FaShieldAlt />,
    tagline: 'Full exchange / fund coverage',
    useCase: 'Exchanges, large DAOs, crypto funds',
    realWorldWallets: ['🏦 Hot/cold/reserve wallet sets (×6)', '🔐 Committee multi-sigs (×4)', '📦 Vault wallets (×4)', '⚙️ Operational wallets (×4)', '+ Custom pairs on request'],
    features: ['20 wallets monitored', 'Custom ML model training', 'White-label dashboard', 'On-chain anomaly oracle', 'Flash loan & MEV detection', 'Enterprise SLA + legal compliance'],
  },
];

export default function PricingPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [subscribed, setSubscribed] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleSubscribe = (id: number) => {
    setSelected(id);
    setTimeout(() => { setSubscribed(id); setSelected(null); }, 1200);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#051008', padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(141,220,164,0.1)', border: '1px solid rgba(141,220,164,0.2)',
          borderRadius: 50, padding: '6px 16px', marginBottom: 24 }}>
          <FaUsers style={{ color: '#8ddca4' }} />
          <span style={{ color: '#8ddca4', fontSize: 13, fontWeight: 600 }}>For Businesses &amp; Teams</span>
        </div>
        <h1 style={{ color: 'white', fontSize: 40, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Monitor Multiple Wallets
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 560, margin: '0 auto 16px' }}>
          Per candidate · per month · always in even pairs.
          The more wallets you monitor, the less you pay per wallet — up to <strong style={{color:'#22c55e'}}>40% off</strong> at Enterprise tier.
        </p>

        {/* Volume discount indicator */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '8px 16px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Per-wallet price:</span>
          {['$25','$22','$20','$18','$15'].map((p, i, arr) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: TIERS[i].color, fontWeight: 700, fontSize: 13 }}>{p}</span>
              {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>→</span>}
            </span>
          ))}
          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>↓ Savings grow</span>
        </div>
      </div>

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, marginBottom: 48 }}>
        {TIERS.map(t => (
          <div key={t.id} className="card" style={{
            padding: 24, position: 'relative', transition: 'all 0.2s',
            border: t.popular ? `1px solid ${t.color}55` : undefined,
            transform: t.popular ? 'scale(1.03)' : undefined,
          }}>
            {t.popular && (
              <span style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                background: t.color, color: '#051008', fontSize: 10, fontWeight: 800,
                padding: '3px 12px', borderRadius: 50, whiteSpace: 'nowrap' }}>MOST POPULAR</span>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: t.color, fontSize: 16 }}>{t.icon}</span>
              <h2 style={{ color: t.color, fontSize: 17, fontWeight: 700, margin: 0 }}>{t.name}</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 12px', fontStyle: 'italic' }}>{t.tagline}</p>

            {/* Price */}
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'white', fontSize: 36, fontWeight: 800 }}>${t.price}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/mo</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '0 0 4px' }}>
              {t.wallets} wallets · <span style={{ color: t.color, fontWeight: 700 }}>${t.perWallet.toFixed(2)}/wallet</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '0 0 16px' }}>{t.useCase}</p>

            {/* Wallet list toggle */}
            <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, padding: '5px 10px', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 12, marginBottom: 14, width: '100%', textAlign: 'left',
            }}>
              {expanded === t.id ? '▼' : '▶'} View included wallets
            </button>
            {expanded === t.id && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px',
                            marginBottom: 14 }}>
                {t.realWorldWallets.map(w => (
                  <p key={w} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '3px 0', lineHeight: 1.4 }}>{w}</p>
                ))}
              </div>
            )}

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t.features.map(f => (
                <li key={f} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <FaCheck style={{ color: t.color, fontSize: 10, marginTop: 3, flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {subscribed === t.id ? (
              <div style={{ background: `${t.color}18`, border: `1px solid ${t.color}44`, borderRadius: 8,
                            padding: '10px', textAlign: 'center', color: t.color, fontWeight: 700, fontSize: 13 }}>
                ✓ Subscribed! {t.wallets} wallets assigned.
              </div>
            ) : (
              <button onClick={() => handleSubscribe(t.id)} disabled={selected === t.id} style={{
                width: '100%', background: t.color, color: '#051008', border: 'none', borderRadius: 8,
                padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: selected === t.id ? 0.7 : 1, transition: 'all 0.2s',
              }}>
                {selected === t.id ? 'Processing…' : 'Subscribe Now'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Why pairs + profit logic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ color: '#8ddca4', fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>🔗 Why always pairs?</h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            Guardiant monitors wallets in pairs so the ML model can <strong style={{color:'#8ddca4'}}>cross-correlate behaviour</strong>.
            This catches smurfing, layering, and coordinated drains that are invisible on isolated wallets.
            Pairs also enable instant atomic asset transfers if one wallet is compromised.
          </p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ color: '#22c55e', fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>📉 Volume discount explained</h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            The more wallets you monitor, the less you pay per wallet.
            At 2 wallets you pay <strong style={{color:'#8ddca4'}}>$25/wallet</strong>;
            at 20 wallets just <strong style={{color:'#22c55e'}}>$15/wallet</strong> — a
            <strong style={{color:'#22c55e'}}> 40% saving</strong>. Scale your protection as your team grows
            without the cost growing proportionally.
          </p>
        </div>
      </div>

      {/* B2C note */}
      <div style={{ textAlign: 'center', padding: '28px 0', borderTop: '1px solid rgba(141,220,164,0.08)' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 16 }}>
          Protecting your own wallet? Core rug-pull protection is <strong style={{ color: '#8ddca4' }}>free</strong> for individual users — just connect MetaMask.
        </p>
        <Connect />
      </div>

      <style>{`
        @media (max-width: 900px) { .pricing-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 560px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  );
}
