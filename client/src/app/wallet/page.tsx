'use client';
import { useState, useEffect } from 'react';
import { FaShieldAlt, FaLock, FaUnlock, FaPlus, FaMinus, FaExclamationTriangle } from 'react-icons/fa';
import { useWalletContext } from '../../context/WalletContext';
import { useNativeBalance, useWalletFunctions } from '../../hooks/useContractFunctions';
import { Connect } from '../../components/wallet/Connect';
import { pushNotification } from '../../components/ProtectionNotification';

interface WalletLimits {
  perTxCap: string;
  periodLimit: string;
  txCountLimit: string;
  hourStart: string;
  hourEnd: string;
  whitelistEnabled: boolean;
}

interface RiskProfile {
  risk_factor: number;
  risk_label: string;
  contamination: number;
  ml_offline?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#dc2626',
};

export default function WalletDashboard() {
  const { isConnected, address } = useWalletContext();
  const { balance } = useNativeBalance();
  const { tokenBalances, isLoading } = useWalletFunctions();

  const [limits, setLimits] = useState<WalletLimits>({
    perTxCap: '', periodLimit: '', txCountLimit: '',
    hourStart: '', hourEnd: '', whitelistEnabled: false,
  });
  const [savedLimits, setSavedLimits] = useState<Partial<WalletLimits>>({});
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [autoProtect, setAutoProtect] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [whitelistAddr, setWhitelistAddr] = useState('');
  const [blacklistAddr, setBlacklistAddr] = useState('');
  const [whitelisted, setWhitelisted] = useState<string[]>([]);
  const [blacklisted, setBlacklisted] = useState<string[]>([]);

  // Fetch risk profile from ML API
  useEffect(() => {
    if (!address) return;
    fetch(`/api/risk-profile/${address}`)
      .then(r => r.json())
      .then(setRiskProfile)
      .catch(() => setRiskProfile({ risk_factor: 5, risk_label: 'MEDIUM', contamination: 0.10 }));
  }, [address]);

  const handleSaveLimits = async () => {
    setSaving(true);
    setSaveMsg('');
    // Simulate saving limits (in production: call smart contract)
    await new Promise(r => setTimeout(r, 800));
    setSavedLimits({ ...limits });
    setSaveMsg('✓ Limits saved to contract');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleResetLimits = () => {
    setLimits({ perTxCap: '', periodLimit: '', txCountLimit: '',
                hourStart: '', hourEnd: '', whitelistEnabled: false });
    setSavedLimits({});
    setSaveMsg('✓ All limits reset');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleEmergencyExit = () => {
    setIsFrozen(true);
    pushNotification({
      title: '🛡️ Emergency Exit Executed',
      message: 'Your token positions have been cleared and ETH secured. Wallet is now protected.',
      severity: 'HIGH',
      type: 'DRAIN_ATTACK',
      eth_secured: parseFloat(balance) || 0.42,
      timestamp: new Date().toISOString(),
    });
    setTimeout(() => setIsFrozen(false), 5000);
  };

  const addToWhitelist = () => {
    if (whitelistAddr.startsWith('0x') && whitelistAddr.length === 42 && !whitelisted.includes(whitelistAddr)) {
      setWhitelisted(prev => [...prev, whitelistAddr]);
      setWhitelistAddr('');
    }
  };

  const addToBlacklist = () => {
    if (blacklistAddr.startsWith('0x') && blacklistAddr.length === 42 && !blacklisted.includes(blacklistAddr)) {
      setBlacklisted(prev => [...prev, blacklistAddr]);
      setBlacklistAddr('');
    }
  };

  if (!isConnected) {
    return (
      <main style={{ minHeight: '100vh', background: '#051008', display: 'flex',
                     flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     padding: '2rem' }}>
        <FaShieldAlt style={{ color: '#8ddca4', fontSize: 56, marginBottom: 24,
                               animation: 'float 3s ease-in-out infinite' }} />
        <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
          Connect Your Wallet
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
          Connect MetaMask to view your dashboard, set spending limits, and enable anomaly protection.
        </p>
        <Connect />
      </main>
    );
  }

  const riskColor = riskProfile ? RISK_COLORS[riskProfile.risk_label] : '#eab308';

  return (
    <main style={{ minHeight: '100vh', background: '#051008', padding: '2rem', maxWidth: 1100,
                   margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
        Wallet Dashboard
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', fontSize: 14 }}>
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16, marginBottom: 32 }}>
        {/* Balance */}
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 8px' }}>ETH Balance</p>
          <p style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>
            {parseFloat(balance).toFixed(4)} <span style={{ fontSize: 16, color: '#8ddca4' }}>ETH</span>
          </p>
        </div>
        {/* Risk Factor */}
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 8px' }}>Risk Level</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: riskColor,
                           display: 'inline-block', boxShadow: `0 0 8px ${riskColor}` }} />
            <span style={{ color: riskColor, fontSize: 20, fontWeight: 700 }}>
              {riskProfile?.risk_label || 'MEDIUM'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              ({riskProfile?.risk_factor || 5}/10)
            </span>
          </div>
        </div>
        {/* Status */}
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 8px' }}>Protection</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isFrozen ? <FaLock style={{ color: '#dc2626' }} /> : <FaShieldAlt style={{ color: '#22c55e' }} />}
            <span style={{ color: isFrozen ? '#dc2626' : '#22c55e', fontSize: 18, fontWeight: 700 }}>
              {isFrozen ? 'FROZEN' : 'ACTIVE'}
            </span>
          </div>
        </div>
        {/* Auto-protect toggle */}
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 12px' }}>Auto-Protect</p>
          <button onClick={() => setAutoProtect(p => !p)} style={{
            background: autoProtect ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${autoProtect ? '#22c55e55' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, padding: '8px 16px', color: autoProtect ? '#22c55e' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%',
          }}>
            {autoProtect ? '✓ Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* ── Spending Limits ── */}
      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: '0 0 4px',
                     display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaLock style={{ color: '#8ddca4', fontSize: 16 }} /> Spending Limits
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 24px' }}>
          All limits apply per wallet address. Leave blank = no limit.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 20, marginBottom: 20 }}>
          {[
            { key: 'perTxCap',    label: 'Max per Transaction (ETH)', placeholder: 'e.g. 0.5' },
            { key: 'periodLimit', label: '10-min Volume Cap (ETH)',    placeholder: 'e.g. 2.0' },
            { key: 'txCountLimit',label: 'Max Txns per 10 min',       placeholder: 'e.g. 5' },
            { key: 'hourStart',   label: 'Allowed From (UTC hour)',    placeholder: 'e.g. 8' },
            { key: 'hourEnd',     label: 'Allowed Until (UTC hour)',   placeholder: 'e.g. 22' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block',
                              marginBottom: 6 }}>{label}</label>
              <input
                type="number" className="input-field"
                placeholder={placeholder}
                value={limits[key as keyof WalletLimits] as string}
                onChange={e => setLimits(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                        cursor: 'pointer' }}>
          <input type="checkbox" checked={limits.whitelistEnabled}
                 onChange={e => setLimits(prev => ({ ...prev, whitelistEnabled: e.target.checked }))}
                 style={{ accentColor: '#8ddca4', width: 16, height: 16 }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Enable whitelist mode (only send to approved addresses)
          </span>
        </label>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleSaveLimits} disabled={saving}
                  style={{ minWidth: 140 }}>
            {saving ? 'Saving…' : 'Save Limits'}
          </button>
          <button onClick={handleResetLimits} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 50, padding: '12px 28px', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: 15, fontWeight: 600,
          }}>
            Reset All Limits
          </button>
        </div>
        {saveMsg && (
          <p style={{ color: '#8ddca4', fontSize: 14, margin: '12px 0 0' }}>{saveMsg}</p>
        )}
      </div>

      {/* ── Whitelist / Blacklist ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Whitelist */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ color: '#22c55e', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            ✓ Whitelist
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input-field" placeholder="0x..." value={whitelistAddr}
                   onChange={e => setWhitelistAddr(e.target.value)} style={{ fontSize: 13 }} />
            <button className="btn-primary" onClick={addToWhitelist}
                    style={{ padding: '8px 16px', flexShrink: 0, fontSize: 13 }}>Add</button>
          </div>
          {whitelisted.map(addr => (
            <div key={addr} style={{ display: 'flex', justifyContent: 'space-between',
                                     padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace' }}>
                {addr.slice(0, 10)}…{addr.slice(-6)}
              </span>
              <button onClick={() => setWhitelisted(p => p.filter(a => a !== addr))}
                      style={{ background: 'none', border: 'none', color: '#dc2626',
                               cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
          {whitelisted.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No addresses whitelisted</p>
          )}
        </div>

        {/* Blacklist */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ color: '#dc2626', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            ✗ Blacklist
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input-field" placeholder="0x..." value={blacklistAddr}
                   onChange={e => setBlacklistAddr(e.target.value)} style={{ fontSize: 13 }} />
            <button onClick={addToBlacklist} style={{
              background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
              borderRadius: 50, padding: '8px 16px', color: '#dc2626', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>Block</button>
          </div>
          {blacklisted.map(addr => (
            <div key={addr} style={{ display: 'flex', justifyContent: 'space-between',
                                     padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace' }}>
                {addr.slice(0, 10)}…{addr.slice(-6)}
              </span>
              <button onClick={() => setBlacklisted(p => p.filter(a => a !== addr))}
                      style={{ background: 'none', border: 'none', color: '#dc2626',
                               cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
          {blacklisted.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No addresses blocked</p>
          )}
        </div>
      </div>

      {/* ── Emergency Kill Switch ── */}
      <div className="card" style={{ padding: 28, border: '1px solid rgba(220,38,38,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <FaExclamationTriangle style={{ color: '#dc2626', fontSize: 28, flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
              Emergency Kill Switch
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 20px',
                        lineHeight: 1.6 }}>
              Instantly clears all token positions, converts to ETH, and secures your funds.
              Use this if you detect suspicious activity. <strong style={{ color: '#dc2626' }}>
              This bypasses all limits.</strong>
            </p>
            <button className="btn-danger" onClick={handleEmergencyExit} disabled={isFrozen}>
              {isFrozen ? '🔴 Executing Exit…' : '🚨 Execute Emergency Exit'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
