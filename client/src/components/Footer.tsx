import Link from 'next/link';
import { FaShieldAlt, FaGithub, FaTwitter } from 'react-icons/fa';

const LINKS = [
  { group: 'Product', items: [
    { href: '/',            label: 'Home'       },
    { href: '/wallet',      label: 'Dashboard'  },
    { href: '/demo',        label: 'Demo'       },
    { href: '/pricing',     label: 'Pricing'    },
  ]},
  { group: 'App', items: [
    { href: '/transfer',    label: 'Send'       },
    { href: '/transactions',label: 'History'    },
    { href: '/graph',       label: 'Chart'      },
    { href: '/tokens',      label: 'Tokens'     },
  ]},
  { group: 'Protocol', items: [
    { href: '/create',      label: 'Create Token' },
    { href: '/liquidity',   label: 'Liquidity'   },
  ]},
];

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(141,220,164,0.1)',
      background: 'rgba(5,16,8,0.97)',
      padding: '56px 2rem 32px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 40,
          marginBottom: 48,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <FaShieldAlt style={{ color: '#00d4ff', fontSize: 22 }} />
              <span style={{ color: '#00d4ff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Space Grotesk, sans-serif' }}>
                Guardiant
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>
              AI-powered anomaly detection to stop rug pulls before they happen.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8ddca4')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                aria-label="GitHub"
              >
                <FaGithub />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8ddca4')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
            </div>
          </div>

          {/* Link groups */}
          {LINKS.map(({ group, items }) => (
            <div key={group}>
              <p style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {group}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#8ddca4')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Status */}
          <div>
            <p style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Status
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 50, padding: '6px 14px',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#00d4ff',
                display: 'inline-block', boxShadow: '0 0 6px #00d4ff',
                animation: 'pulse-glow 2s infinite',
              }} />
              <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600 }}>
                All Systems Operational
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 12 }}>
              ML API · Blockchain Node · UI
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          paddingTop: 24,
          borderTop: '1px solid rgba(0,212,255,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0 }}>
            © {new Date().getFullYear()} Guardiant — SaveMe Protocol. All rights reserved.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, margin: 0 }}>
            Built on Ethereum · Powered by Isolation Forest + XGBoost
          </p>
        </div>
      </div>
    </footer>
  );
}
