'use client';
import { useState, useEffect, useRef } from 'react';
import { FaShieldAlt, FaBolt, FaEthereum, FaLock, FaRocket, FaTerminal } from 'react-icons/fa';
import { Connect } from '../components/wallet/Connect';
import Link from 'next/link';
import { useWalletContext } from '../context/WalletContext';

// ── Live threat ticker data ───────────────────────────────────────────────
const TICKER = [
  '⚡ VELOCITY_SPIKE · 0x9af3...c81 · 12 txns/10min · NEUTRALIZED',
  '🐋 LARGE_TRANSFER · 0x7fe2...aa3 · 25.4 ETH → unknown · FROZEN',
  '🪤 RUG_PULL · 0x4bc1...f92 · LP drain attempt · AUTO-SWAPPED',
  '🕳️ DRAIN_ATTACK · 0x2cd8...b17 · $42,300 protected · SECURED',
  '⚙️ FLASH_LOAN · 0x88af...e04 · 500 ETH borrow · INTERCEPTED',
  '🍯 HONEYPOT · 0x3e19...c55 · buy-only contract · BLOCKED',
  '🎭 SMURFING · 0x1af4...d22 · 8 × $990 transfers · PAUSED',
  '🪆 LAYERING · 0x5bc3...a89 · fund-split pattern · HALTED',
];

// ── Anomaly threat types ──────────────────────────────────────────────────
const ANOMALIES = [
  { icon: '⚡', name: 'Velocity Spike', desc: 'Abnormal tx burst in 10-min window', color: '#fbbf24', risk: 'HIGH' },
  { icon: '🐋', name: 'Large Transfer', desc: 'Single transfer 20× above baseline', color: '#f97316', risk: 'HIGH' },
  { icon: '🪤', name: 'Rug Pull', desc: 'Pump followed by instant LP drain', color: '#ff3366', risk: 'CRITICAL' },
  { icon: '🕳️', name: 'Drain Attack', desc: 'Full wallet drain to unknown address', color: '#ff3366', risk: 'CRITICAL' },
  { icon: '🪆', name: 'Layering', desc: 'Funds split across addresses to evade', color: '#a855f7', risk: 'MEDIUM' },
  { icon: '🍯', name: 'Honeypot', desc: 'Buy-only contract interaction detected', color: '#fbbf24', risk: 'HIGH' },
  { icon: '⚙️', name: 'Flash Loan', desc: 'Borrow → manipulate → repay pattern', color: '#ff3366', risk: 'CRITICAL' },
  { icon: '🎭', name: 'Smurfing', desc: 'Near-threshold repeated micro transfers', color: '#60a5fa', risk: 'MEDIUM' },
];

// ── Pricing tiers ─────────────────────────────────────────────────────────
const TIERS = [
  { name: 'Individual', price: 50,  wallets: 2,  perWallet: 25, color: '#00d4ff', features: ['2 wallets', 'Real-time alerts', 'ML risk scoring', 'Email notifications'] },
  { name: 'Startup',    price: 88,  wallets: 4,  perWallet: 22, color: '#a855f7', features: ['4 wallets', 'Priority alerts', 'Auto-protect mode', 'API access'] },
  { name: 'Business',   price: 120, wallets: 6,  perWallet: 20, color: '#00ff88', features: ['6 wallets', 'Custom thresholds', 'Smart auto-swap', 'Dashboard'], popular: true },
  { name: 'Agency',     price: 180, wallets: 10, perWallet: 18, color: '#fbbf24', features: ['10 wallets', 'White-label UI', 'Dedicated ML node', 'SLA guarantee'] },
];

// ── How it works steps ────────────────────────────────────────────────────
const STEPS = [
  { icon: '🔌', title: 'Connect Wallet', desc: 'Link your MetaMask. No private keys — read-only monitoring.' },
  { icon: '🧠', title: 'AI Scans Live', desc: 'Isolation Forest + XGBoost analyze every transaction in real-time.' },
  { icon: '🚨', title: 'Threat Detected', desc: 'Anomaly score > threshold triggers instant alert with full explanation.' },
  { icon: '🛡️', title: 'Auto-Protect', desc: 'Guardiant auto-swaps assets to ETH via Liquidity Pool before drain.' },
];

// ── Counter component ─────────────────────────────────────────────────────
function Counter({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    let v = 0;
    const step = target / 70;
    const t = setInterval(() => {
      v = Math.min(v + step, target);
      setVal(v);
      if (v >= target) { clearInterval(t); done.current = true; }
    }, 18);
    return () => clearInterval(t);
  }, [target]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

// ── Threat Radar ──────────────────────────────────────────────────────────
function ThreatRadar() {
  const SIZE = 340;
  const C = SIZE / 2;
  const threats = [
    { angle: 48,  r: 0.64, color: '#ff3366', label: 'DRAIN' },
    { angle: 142, r: 0.44, color: '#fbbf24', label: 'SMURF' },
    { angle: 225, r: 0.71, color: '#ff3366', label: 'FLASH' },
    { angle: 305, r: 0.38, color: '#a855f7', label: 'LAYER' },
    { angle: 88,  r: 0.82, color: '#f97316', label: 'RUG' },
  ];

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      {/* Outer ring glow */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: '0 0 60px rgba(0,212,255,0.08)',
      }} />
      {/* Rings */}
      {[1, 0.75, 0.5, 0.25].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: SIZE * s, height: SIZE * s,
          border: `1px solid rgba(0,212,255,${0.06 + i * 0.05})`,
          borderRadius: '50%',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
        }} />
      ))}
      {/* Crosshairs */}
      <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, height: 1, background: 'rgba(0,212,255,0.07)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 12, bottom: 12, width: 1, background: 'rgba(0,212,255,0.07)', transform: 'translateX(-50%)' }} />
      {/* Sweep arm */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '50%', height: 2,
        background: 'linear-gradient(90deg, rgba(0,212,255,0.9), transparent)',
        transformOrigin: 'left center',
        animation: 'orbit 4s linear infinite',
      }} />
      {/* Sweep cone */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, rgba(0,212,255,0.08) 0deg, transparent 90deg)',
        animation: 'orbit 4s linear infinite',
      }} />
      {/* Cardinal tick marks */}
      {[0,90,180,270].map(a => {
        const r = (a * Math.PI) / 180;
        return (
          <div key={a} style={{
            position: 'absolute',
            left: C + Math.cos(r) * (C - 8) - 1, top: C + Math.sin(r) * (C - 8) - 4,
            width: 2, height: 8, background: 'rgba(0,212,255,0.25)',
            transform: `rotate(${a}deg)`,
          }} />
        );
      })}
      {/* Center shield */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.1))',
        border: '1.5px solid rgba(0,212,255,0.5)',
        transform: 'translate(-50%,-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(0,212,255,0.35)',
      }}>
        <FaShieldAlt style={{ color: '#00d4ff', fontSize: 20 }} />
      </div>
      {/* Threat dots */}
      {threats.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const r = C * d.r;
        const x = C + Math.cos(rad) * r;
        const y = C + Math.sin(rad) * r;
        return (
          <div key={i}>
            <div style={{
              position: 'absolute', left: x - 5, top: y - 5,
              width: 10, height: 10, borderRadius: '50%',
              background: d.color, boxShadow: `0 0 10px ${d.color}, 0 0 20px ${d.color}44`,
              animation: 'pulse-glow 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.35}s`,
            }} />
            <div style={{
              position: 'absolute', left: x + 8, top: y - 8,
              color: d.color, fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap',
            }}>
              {d.label}
            </div>
          </div>
        );
      })}
      {/* Status label */}
      <div style={{
        position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(0,212,255,0.45)', fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em',
      }}>
        ● THREAT RADAR · SCANNING 4,821 WALLETS
      </div>
    </div>
  );
}

// ── Terminal box (animated typing) ───────────────────────────────────────
const LINES = [
  { text: '$ guardiant --monitor 0x8626...1199', color: 'rgba(255,255,255,0.6)' },
  { text: '> Isolation Forest.............. ✓', color: '#00d4ff' },
  { text: '> XGBoost classifier............ ✓', color: '#00d4ff' },
  { text: '> Monitoring 4,821 wallets......', color: 'rgba(255,255,255,0.4)' },
  { text: '⚠ ANOMALY: drain_attack [0x9af3]', color: '#ff3366' },
  { text: '  Risk Score: 91/100 · CRITICAL', color: '#ff3366' },
  { text: '🛡 Auto-protect: assets → ETH', color: '#00ff88' },
  { text: '✓ 2.4 ETH secured in 140ms', color: '#00ff88' },
];

function TerminalBox() {
  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    if (visibleLines >= LINES.length) return;
    const t = setTimeout(() => setVisibleLines(v => v + 1), 480);
    return () => clearTimeout(t);
  }, [visibleLines]);

  return (
    <div style={{
      background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,212,255,0.15)',
      borderRadius: 12, padding: '18px 20px', fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13, lineHeight: 1.7, backdropFilter: 'blur(12px)',
      boxShadow: '0 0 40px rgba(0,212,255,0.06)',
      minHeight: 200,
    }}>
      {/* Terminal header bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3366' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff88' }} />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginLeft: 8 }}>guardiant-ai v2.1.0</span>
      </div>
      {LINES.slice(0, visibleLines).map((l, i) => (
        <div key={i} style={{ color: l.color }}>{l.text}</div>
      ))}
      {visibleLines < LINES.length && (
        <span style={{ display: 'inline-block', width: 8, height: 14, background: '#00d4ff', animation: 'data-blink 0.8s infinite', verticalAlign: 'middle' }} />
      )}
    </div>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = { CRITICAL: '#ff3366', HIGH: '#f97316', MEDIUM: '#fbbf24', LOW: '#00ff88' };
  const c = map[risk] || '#aaa';
  return (
    <span style={{
      background: `${c}18`, border: `1px solid ${c}44`,
      color: c, fontSize: 10, fontWeight: 800, padding: '2px 8px',
      borderRadius: 50, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
    }}>
      {risk}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const { isConnected } = useWalletContext();

  return (
    <main style={{ background: '#020817', overflowX: 'hidden', color: 'white' }}>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Threat Command Center
      ═══════════════════════════════════════════════════════════════ */}
      <section className="hex-bg glow-bg" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
        {/* Purple glow orb top-right */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {/* Cyan glow orb bottom-left */}
        <div style={{
          position: 'absolute', bottom: 0, left: -200, width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 1220, margin: '0 auto', padding: '0 2rem',
          display: 'flex', alignItems: 'center', minHeight: '100vh',
          gap: 64, paddingTop: 96, paddingBottom: 80,
          flexWrap: 'wrap', justifyContent: 'center',
          position: 'relative', zIndex: 1,
        }}>
          {/* ── LEFT: Copy ── */}
          <div style={{ flex: '1 1 480px', maxWidth: 580 }}>
            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
                          background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
                          borderRadius: 50, padding: '6px 16px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88',
                            boxShadow: '0 0 8px #00ff88', animation: 'pulse-glow 1.5s infinite' }} />
              <span style={{ color: '#00ff88', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                             fontFamily: 'JetBrains Mono, monospace' }}>
                LIVE PROTECTION ACTIVE — 4,821 WALLETS
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.6rem, 5vw, 4.2rem)', fontWeight: 900, lineHeight: 1.05,
              letterSpacing: '-0.04em', margin: '0 0 20px', color: 'white',
            }}
              className="glitch-heading"
            >
              STOP{' '}
              <span style={{
                background: 'linear-gradient(135deg, #ff3366, #a855f7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                RUG PULLS
              </span>
              <br />
              BEFORE THEY{' '}
              <span style={{
                background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                HAPPEN.
              </span>
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.7,
              margin: '0 0 36px', maxWidth: 480,
            }}>
              Guardiant fuses{' '}
              <span style={{ color: '#00d4ff', fontWeight: 600 }}>Isolation Forest</span> anomaly detection with{' '}
              <span style={{ color: '#a855f7', fontWeight: 600 }}>XGBoost</span> threat classification to intercept drain attacks,
              flash loan exploits, and rug pulls — automatically.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
              {isConnected ? (
                <Link href="/wallet">
                  <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaShieldAlt /> Open Dashboard
                  </button>
                </Link>
              ) : (
                <Connect />
              )}
              <Link href="/demo">
                <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaTerminal style={{ fontSize: 13 }} /> Live Demo
                </button>
              </Link>
            </div>

            {/* Terminal box */}
            <TerminalBox />
          </div>

          {/* ── RIGHT: Radar ── */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div className="float-slow">
              <ThreatRadar />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: '0.1em', textAlign: 'center' }}>
              REAL-TIME THREAT VISUALIZATION
            </p>
          </div>
        </div>

        {/* ── Threat ticker ── */}
        <div style={{
          borderTop: '1px solid rgba(0,212,255,0.1)',
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
          padding: '10px 0', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ display: 'inline-flex', gap: '4rem', whiteSpace: 'nowrap',
                        animation: 'ticker 32s linear infinite' }}>
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} style={{
                color: 'rgba(255,255,255,0.55)', fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          LIVE STATS
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          {[
            { n: 4821, suf: '', pre: '', label: 'Wallets Protected', color: '#00d4ff' },
            { n: 312,  suf: '',  pre: '', label: 'Threats Intercepted', color: '#ff3366' },
            { n: 2.4,  suf: 'M', pre: '$', label: 'ETH Secured', color: '#00ff88', dec: 1 },
            { n: 140,  suf: 'ms', pre: '', label: 'Avg Response Time', color: '#a855f7' },
          ].map(({ n, suf, pre, label, color, dec = 0 }) => (
            <div key={label} style={{ padding: '28px 32px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{
                color, fontSize: 42, fontWeight: 900, margin: '0 0 6px',
                letterSpacing: '-0.03em', fontFamily: 'Space Grotesk, sans-serif',
                textShadow: `0 0 30px ${color}44`,
              }}>
                {pre}<Counter target={n} suffix={suf} decimals={dec} />{!suf.match(/M|ms/) ? suf : ''}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0, fontWeight: 500, letterSpacing: '0.02em' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS — Pipeline
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                         fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 12 }}>
            // HOW IT WORKS
          </span>
          <h2 className="section-title" style={{ margin: 0 }}>
            Four steps.{' '}
            <span className="gradient-text">Zero compromise.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, position: 'relative' }}>
          {/* Connecting line */}
          <div style={{ position: 'absolute', top: 40, left: '12%', right: '12%', height: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2), rgba(168,85,247,0.2), transparent)',
                        pointerEvents: 'none' }} />

          {STEPS.map((step, i) => (
            <div key={i} style={{ padding: '32px 24px', textAlign: 'center', position: 'relative' }}>
              {/* Step number */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, position: 'relative', zIndex: 1,
                boxShadow: '0 0 20px rgba(0,212,255,0.12)',
              }}>
                {step.icon}
              </div>
              <div style={{
                position: 'absolute', top: 16, right: 16,
                color: 'rgba(0,212,255,0.2)', fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              }}>
                0{i + 1}
              </div>
              <h3 style={{ color: 'white', fontSize: 17, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
                {step.title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          THREAT MATRIX — 8 Anomaly Types
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 2rem 100px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ color: '#ff3366', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                           fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 12 }}>
              // THREAT MATRIX
            </span>
            <h2 className="section-title" style={{ margin: 0 }}>
              8 vectors.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #ff3366, #a855f7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Zero tolerance.
              </span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginTop: 12 }}>
              Every anomaly class that Guardiant tracks and neutralizes in real-time.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {ANOMALIES.map((a, i) => (
              <div
                key={i}
                className="card-holo"
                style={{
                  padding: '24px',
                  background: 'rgba(0,0,0,0.4)',
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${a.color}15`,
                    border: `1px solid ${a.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>{a.name}</h3>
                      <RiskBadge risk={a.risk} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      {a.desc}
                    </p>
                  </div>
                </div>
                {/* Risk bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 14 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: a.color,
                    width: a.risk === 'CRITICAL' ? '95%' : a.risk === 'HIGH' ? '72%' : '45%',
                    boxShadow: `0 0 8px ${a.color}66`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          AI ENGINE SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 2rem' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 64, alignItems: 'center',
        }}>
          {/* Left: copy */}
          <div>
            <span style={{ color: '#a855f7', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                           fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 16 }}>
              // AI ENGINE
            </span>
            <h2 className="section-title">
              Two models.<br />
              <span className="gradient-text">One shield.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
              We combine <strong style={{ color: '#00d4ff' }}>unsupervised anomaly detection</strong> with a
              supervised classifier trained on 50,000+ real DeFi attack patterns.
              Together they cover both known and unknown threat vectors.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Isolation Forest', sub: 'Unsupervised · Zero-day threats', color: '#00d4ff', pct: 87 },
                { label: 'XGBoost Classifier', sub: 'Supervised · 99.2% accuracy', color: '#a855f7', pct: 99 },
                { label: 'Response Latency', sub: 'From tx → decision', color: '#00ff88', pct: 100, display: '140ms' },
              ].map(({ label, sub, color, pct: p, display }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginLeft: 10 }}>{sub}</span>
                    </div>
                    <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>
                      {display || `${p}%`}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: color,
                      width: `${p}%`, boxShadow: `0 0 10px ${color}55`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Terminal stats display */}
          <div style={{
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,212,255,0.12)',
            borderRadius: 16, padding: '28px', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, lineHeight: 1.8, backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {['#ff3366','#fbbf24','#00ff88'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginLeft: 6 }}>model-inference.log</span>
            </div>
            {[
              ['// Isolation Forest', 'rgba(0,212,255,0.6)'],
              ['  contamination = 0.1', 'rgba(255,255,255,0.4)'],
              ['  n_estimators  = 200', 'rgba(255,255,255,0.4)'],
              ['  anomaly_score = -0.421  ← FLAGGED', '#ff3366'],
              ['', ''],
              ['// XGBoost Prediction', 'rgba(168,85,247,0.8)'],
              ['  threat_class  = RUG_PULL', '#ff3366'],
              ['  confidence    = 0.97', '#fbbf24'],
              ['  severity      = CRITICAL', '#ff3366'],
              ['', ''],
              ['🛡 auto_protect(wallet) → triggered', '#00ff88'],
              ['✓ swap ETH completed in 140ms', '#00ff88'],
              ['✓ alert dispatched → 0x8626', '#00ff88'],
            ].map(([line, color], i) => (
              <div key={i} style={{ color: color as string }}>{line as string}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 2rem 100px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ color: '#00ff88', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                           fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 12 }}>
              // PRICING
            </span>
            <h2 className="section-title" style={{ margin: 0 }}>
              Protection starts at{' '}
              <span className="cyber-text">$25/wallet</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginTop: 12 }}>
              Pay once. Protect forever. No gas fees, no subscriptions on-chain.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="card-holo"
                style={{
                  padding: '28px 24px',
                  background: tier.popular ? `linear-gradient(160deg, rgba(0,255,136,0.06), rgba(0,212,255,0.04))` : 'rgba(0,0,0,0.4)',
                  position: 'relative',
                }}
              >
                {tier.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#020817', fontSize: 10, fontWeight: 900, padding: '3px 14px',
                    borderRadius: 50, letterSpacing: '0.08em', whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ color: tier.color, fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em' }}>
                  {tier.name.toUpperCase()}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: 'white', fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em' }}>
                    ${tier.price}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginLeft: 4 }}>/month</span>
                </div>
                <div style={{
                  color: tier.color, fontSize: 12, marginBottom: 24,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {tier.wallets} wallets · ${tier.perWallet}/each
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: tier.color, fontSize: 13 }}>✓</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/pricing">
                  <button style={{
                    width: '100%', padding: '11px 0', borderRadius: 50, fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                    background: tier.popular ? `linear-gradient(135deg, ${tier.color}, #00d4ff)` : `${tier.color}20`,
                    color: tier.popular ? '#020817' : tier.color,
                    boxShadow: tier.popular ? `0 0 20px ${tier.color}44` : 'none',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}>
                    Get {tier.name}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '120px 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow rings */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 50, padding: '6px 16px', marginBottom: 28,
          }}>
            <FaShieldAlt style={{ color: '#00d4ff', fontSize: 14 }} />
            <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
              DEPLOY IN UNDER 2 MINUTES
            </span>
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, margin: '0 0 20px',
            letterSpacing: '-0.04em', lineHeight: 1.1,
          }}>
            Your wallet is unprotected.<br />
            <span className="gradient-text">Fix that now.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 17, maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Connect your wallet in seconds. Guardiant starts scanning immediately — no setup, no config.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Connect />
            <Link href="/demo">
              <button className="btn-ghost">Try Interactive Demo →</button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
