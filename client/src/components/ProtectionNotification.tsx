'use client';

import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  eth_secured: number;
  timestamp: string;
}

// Global notification queue (module-level so any component can push to it)
const listeners: ((n: Notification) => void)[] = [];
export function pushNotification(n: Omit<Notification, 'id'>) {
  const full: Notification = { ...n, id: `${Date.now()}-${Math.random()}` };
  listeners.forEach(cb => cb(full));
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  CRITICAL: { bg: 'rgba(220,38,38,0.15)',  border: '#dc2626', icon: '🚨' },
  HIGH:     { bg: 'rgba(234,88,12,0.15)',  border: '#ea580c', icon: '🔴' },
  MEDIUM:   { bg: 'rgba(202,138,4,0.15)',  border: '#ca8a04', icon: '⚠️' },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', icon: '✅' },
};

export default function ProtectionNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handler = (n: Notification) => {
      setNotifications(prev => [n, ...prev].slice(0, 5));
      // Play subtle alert sound (web audio)
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      } catch { /* ignore */ }
    };
    listeners.push(handler);
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1); };
  }, []);

  const dismiss = (id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400,
    }}>
      {notifications.map(n => {
        const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.MEDIUM;
        return (
          <div key={n.id} style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 12, padding: '14px 16px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 4px 24px ${style.border}33`,
            animation: 'slideIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: '0 0 4px',
                            display: 'flex', alignItems: 'center', gap: 6 }}>
                  {style.icon} {n.title}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 8px',
                            lineHeight: 1.5 }}>
                  {n.message}
                </p>
                {n.eth_secured > 0 && (
                  <p style={{ color: '#8ddca4', fontSize: 12, margin: 0, fontWeight: 600 }}>
                    ✓ {n.eth_secured.toFixed(4)} ETH secured in your wallet
                  </p>
                )}
              </div>
              <button onClick={() => dismiss(n.id)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: 18, marginLeft: 8, lineHeight: 1,
              }}>×</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '8px 0 0' }}>
              {new Date(n.timestamp).toLocaleTimeString()} · Anomaly type: {n.type}
            </p>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
