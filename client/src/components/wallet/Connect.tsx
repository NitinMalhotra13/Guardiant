'use client';
import { useConnect, useDisconnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';

export const Connect = () => {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* MetaMask fox icon */}
        <span style={{ fontSize: 16 }}>🦊</span>
        <button
          onClick={() => disconnect()}
          id="wallet-account-btn"
          style={{
            background: 'rgba(141,220,164,0.12)',
            color: '#8ddca4',
            border: '1px solid rgba(141,220,164,0.25)',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
            transition: 'all 0.15s',
          }}
          title="Click to disconnect"
        >
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button
      id="connect-wallet-btn"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
      style={{
        background: isPending ? 'rgba(141,220,164,0.08)' : 'transparent',
        color: '#8ddca4',
        border: '1px solid rgba(141,220,164,0.4)',
        borderRadius: 50,
        padding: '8px 22px',
        fontSize: 14,
        fontWeight: 600,
        cursor: isPending ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        minWidth: 148,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseOver={e => {
        if (!isPending) {
          const btn = e.currentTarget;
          btn.style.background = '#8ddca4';
          btn.style.color = '#051008';
        }
      }}
      onMouseOut={e => {
        const btn = e.currentTarget;
        btn.style.background = 'transparent';
        btn.style.color = '#8ddca4';
      }}
    >
      <span>🦊</span>
      {isPending ? 'Connecting…' : 'Connect MetaMask'}
    </button>
  );
};
