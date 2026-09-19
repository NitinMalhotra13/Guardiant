'use client';
import React, { useState } from 'react';
import { Connect } from './wallet/Connect';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaShieldAlt, FaBars, FaTimes } from 'react-icons/fa';
import { useWalletContext } from '../context/WalletContext';

const NAV_LINKS = [
  { href: '/transfer',     label: 'Send'    },
  { href: '/transactions', label: 'History' },
  { href: '/tokens',       label: 'Tokens'  },
  { href: '/graph',        label: 'Chart'   },
  { href: '/demo',         label: 'Demo'    },
  { href: '/pricing',      label: 'Pricing' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isConnected } = useWalletContext();

  // Logo links to dashboard when connected, home when not
  const logoHref = isConnected ? '/wallet' : '/';

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,212,255,0.08)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    height: 64 }}>

        {/* Logo — goes to /wallet when connected */}
        <Link href={logoHref} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                       textDecoration: 'none' }}>
          <FaShieldAlt style={{ color: '#00d4ff', fontSize: 22 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ color: '#00d4ff', fontSize: 18, fontWeight: 700,
                           letterSpacing: '-0.02em', fontFamily: 'Space Grotesk, sans-serif' }}>Guardiant</span>
            {isConnected && (
              <span style={{ color: 'rgba(0,212,255,0.45)', fontSize: 10, fontWeight: 500,
                             letterSpacing: '0.05em', marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                ● ACTIVE
              </span>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="desktop-nav">
          {isConnected && (
            <Link href="/wallet" style={{
              color: pathname === '/wallet' ? '#00d4ff' : 'rgba(0,212,255,0.85)',
              background: pathname === '/wallet' ? 'rgba(0,212,255,0.12)' : 'rgba(0,212,255,0.06)',
              border: pathname === '/wallet' ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(0,212,255,0.12)',
              padding: '6px 14px', borderRadius: 8, fontSize: 14,
              fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s',
              boxShadow: pathname === '/wallet' ? '0 0 12px rgba(0,212,255,0.15)' : 'none',
            }}>
              🛡️ Dashboard
            </Link>
          )}
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(href + '/');
            return (
              <Link key={href} href={href} style={{
                color: active ? '#00d4ff' : 'rgba(255,255,255,0.55)',
                background: active ? 'rgba(0,212,255,0.08)' : 'transparent',
                border: active ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                padding: '6px 14px', borderRadius: 8, fontSize: 14,
                fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s',
              }}>
                {label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Connect />
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#00d4ff',
                     cursor: 'pointer', fontSize: 20, display: 'none' }}
            className="hamburger"
            aria-label="Toggle menu"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'rgba(5,16,8,0.97)', borderTop: '1px solid rgba(141,220,164,0.12)',
          padding: '1rem 2rem 1.5rem',
        }}>
          {isConnected && (
            <Link href="/wallet" onClick={() => setMenuOpen(false)} style={{
              display: 'block', color: '#8ddca4', padding: '10px 0', fontSize: 16,
              fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(141,220,164,0.12)',
              marginBottom: 4,
            }}>
              🏠 Dashboard
            </Link>
          )}
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
              display: 'block', color: 'rgba(255,255,255,0.8)', padding: '10px 0',
              fontSize: 16, fontWeight: 500, textDecoration: 'none',
              borderBottom: '1px solid rgba(141,220,164,0.08)',
            }}>
              {label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger   { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
