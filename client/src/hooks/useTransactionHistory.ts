import { useState, useEffect } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { formatEther } from 'viem';
import { useWalletContext } from '../context/WalletContext';

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  timestamp: number;
  isIncoming: boolean;
  // Guardiant enrichment
  riskScore?: number;
  anomalyType?: string;
  isProtected?: boolean;
  gasUsed?: number;
}

const DEMO_TXS = (addr: string): Transaction[] => {
  const now = Math.floor(Date.now() / 1000);
  return [
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000001a', from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', to: addr, value: '0.5000', timestamp: now - 120, isIncoming: true, riskScore: 8, anomalyType: 'NONE', isProtected: false },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000002b', from: addr, to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: '0.1000', timestamp: now - 900, isIncoming: false, riskScore: 12, anomalyType: 'NONE', isProtected: false },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000003c', from: addr, to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', value: '2.0000', timestamp: now - 3600, isIncoming: false, riskScore: 74, anomalyType: 'LARGE_TRANSFER', isProtected: true },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000004d', from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', to: addr, value: '0.0500', timestamp: now - 7200, isIncoming: true, riskScore: 5, anomalyType: 'NONE', isProtected: false },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000005e', from: addr, to: '0xBAD0000000000000000000000000000000000001', value: '1.5000', timestamp: now - 14400, isIncoming: false, riskScore: 91, anomalyType: 'DRAIN_ATTACK', isProtected: true },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000006f', from: addr, to: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', value: '0.0970', timestamp: now - 28800, isIncoming: false, riskScore: 55, anomalyType: 'SMURFING', isProtected: false },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000007a', from: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', to: addr, value: '5.0000', timestamp: now - 86400, isIncoming: true, riskScore: 20, anomalyType: 'NONE', isProtected: false },
    { hash: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000008b', from: addr, to: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', value: '0.0500', timestamp: now - 172800, isIncoming: false, riskScore: 10, anomalyType: 'NONE', isProtected: false },
  ];
};

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const { address, isConnected } = useWalletContext();
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      if (!address || !publicClient || !isConnected) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const lookback = Math.min(Number(blockNumber ?? 0), 50);
        const processed: Transaction[] = [];

        for (let i = 0; i < lookback; i++) {
          try {
            const blockNum = BigInt(Number(blockNumber) - i);
            const block = await publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true });

            if (!block.transactions || typeof block.transactions[0] === 'string') continue;

            for (const tx of block.transactions) {
              if (typeof tx === 'string') continue;
              const toLower   = tx.to?.toLowerCase()  ?? '';
              const fromLower = tx.from.toLowerCase();
              const addrLower = address.toLowerCase();
              const isIncoming = toLower === addrLower;
              const isOutgoing = fromLower === addrLower;

              if (isIncoming || isOutgoing) {
                processed.push({
                  hash: tx.hash, from: tx.from, to: tx.to,
                  value: parseFloat(formatEther(tx.value)).toFixed(4),
                  timestamp: Number(block.timestamp),
                  isIncoming,
                  riskScore: Math.floor(Math.random() * 20), // will be replaced by ML API call
                  anomalyType: 'NONE', isProtected: false,
                });
              }
            }
          } catch { /* skip bad blocks */ }
        }

        if (!isMounted) return;

        if (processed.length === 0) {
          // No on-chain txs yet — show rich demo data so dashboard isn't blank
          setTransactions(DEMO_TXS(address));
          setIsDemo(true);
        } else {
          processed.sort((a, b) => b.timestamp - a.timestamp);
          setTransactions(processed);
          setIsDemo(false);
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to demo on any error (e.g. node not running)
          setTransactions(DEMO_TXS(address ?? '0x0000000000000000000000000000000000000000'));
          setIsDemo(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchHistory();
    const id = setInterval(fetchHistory, 15000); // refresh every 15s
    return () => { isMounted = false; clearInterval(id); };
  }, [address, isConnected, publicClient, blockNumber]);

  return { transactions, isLoading, error, isDemo };
}
