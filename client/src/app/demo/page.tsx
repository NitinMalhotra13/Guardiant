'use client';
import { useState } from 'react';
import { FaPlay, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { pushNotification } from '../../components/ProtectionNotification';

const SCENARIOS = [
  { id:1, icon:'⚡', name:'Velocity Spike', desc:'15 transactions in 10 minutes — 5× normal rate.', color:'#f59e0b', expected:'VELOCITY_SPIKE', severity:'HIGH', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:0.05, tx_count_10min:15, gas_price_gwei:50, is_new_recipient:0, amount_zscore:1.2, period_volume_eth:0.75 } },
  { id:2, icon:'🐋', name:'Large Transfer', desc:'Single 25 ETH transfer — 20× wallet baseline.', color:'#ef4444', expected:'LARGE_TRANSFER', severity:'HIGH', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:25.0, tx_count_10min:1, gas_price_gwei:30, is_new_recipient:1, amount_zscore:7.4, period_volume_eth:25.0 } },
  { id:3, icon:'🪤', name:'Rug Pull Pattern', desc:'Rapid buys followed by massive liquidity drain.', color:'#dc2626', expected:'RUG_PULL', severity:'CRITICAL', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:18.5, tx_count_10min:9, gas_price_gwei:200, is_new_recipient:1, amount_zscore:9.1, period_volume_eth:22.0 } },
  { id:4, icon:'🕳️', name:'Drain Attack', desc:'Unknown address draining wallet repeatedly.', color:'#dc2626', expected:'DRAIN_ATTACK', severity:'CRITICAL', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:3.2, tx_count_10min:6, gas_price_gwei:150, is_new_recipient:1, amount_zscore:5.8, period_volume_eth:9.6 } },
  { id:5, icon:'🪆', name:'Layering', desc:'Large sum split into many equal transfers.', color:'#a78bfa', expected:'LAYERING', severity:'MEDIUM', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:0.1, tx_count_10min:10, gas_price_gwei:40, is_new_recipient:1, is_round_amount:1, amount_zscore:1.8, period_volume_eth:1.0 } },
  { id:6, icon:'🎭', name:'Smurfing', desc:'Near-threshold amounts sent to many wallets.', color:'#60a5fa', expected:'SMURFING', severity:'MEDIUM', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:0.097, tx_count_10min:8, gas_price_gwei:35, is_new_recipient:1, amount_zscore:2.1, period_volume_eth:0.776 } },
  { id:7, icon:'⚙️', name:'Flash Loan Attack', desc:'Borrow 500 ETH → manipulate → repay in 12s.', color:'#dc2626', expected:'FLASH_LOAN_PATTERN', severity:'CRITICAL', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:500.0, tx_count_10min:3, gas_price_gwei:200, is_new_recipient:0, amount_zscore:15.0, period_volume_eth:998.5 } },
  { id:8, icon:'🍯', name:'Honeypot Trap', desc:'Interaction with a buy-only honeypot contract.', color:'#f59e0b', expected:'HONEYPOT_INTERACTION', severity:'HIGH', tx:{ wallet:'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', value_eth:1.5, tx_count_10min:1, gas_price_gwei:60, is_new_recipient:1, amount_zscore:3.2, period_volume_eth:1.5 } },
];

type Result = { is_anomaly:boolean; risk_score:number; anomaly_type:string; severity:string; explanation:string };
type ResultState = Result | 'loading' | null;

export default function DemoPage() {
  const [results, setResults] = useState<Record<number, ResultState>>({});

  const runScenario = async (s: typeof SCENARIOS[0]) => {
    setResults(p => ({ ...p, [s.id]: 'loading' }));
    let r: Result;
    try {
      const res = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ transaction: { ...s.tx, hour_utc: new Date().getUTCHours(), day_of_week: new Date().getUTCDay() } }),
      });
      const data = await res.json();
      r = data.result ?? { is_anomaly:true, risk_score:72+s.id*3, anomaly_type:s.expected, severity:s.severity, explanation:`[Demo] ${s.desc}` };
    } catch {
      r = { is_anomaly:true, risk_score:72+s.id*3, anomaly_type:s.expected, severity:s.severity, explanation:`[Offline demo] ${s.desc}` };
    }
    setResults(p => ({ ...p, [s.id]: r }));
    if (r.is_anomaly) {
      pushNotification({ title:`🛡️ ${s.name} Detected`, message:r.explanation, severity:r.severity as any, type:r.anomaly_type, eth_secured:s.tx.value_eth, timestamp:new Date().toISOString() });
    }
  };

  const sevColor = (s:string) => ({ CRITICAL:'#dc2626', HIGH:'#f97316', MEDIUM:'#eab308', LOW:'#22c55e' }[s]||'#8ddca4');

  return (
    <main style={{ minHeight:'100vh', background:'#051008', padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
      <h1 style={{ color:'white', fontSize:30, fontWeight:800, margin:'0 0 8px' }}>Anomaly Detection Demo</h1>
      <p style={{ color:'rgba(255,255,255,0.4)', margin:'0 0 28px' }}>
        Each test runs through the live <strong style={{color:'#8ddca4'}}>Isolation Forest + XGBoost</strong> ML pipeline.
        Works in offline demo mode too.
      </p>
      <button className="btn-primary" onClick={() => SCENARIOS.forEach((s,i) => setTimeout(()=>runScenario(s), i*500))} style={{marginBottom:32}}>
        ▶ Run All 8 Tests
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(460px, 1fr))', gap:18 }}>
        {SCENARIOS.map(s => {
          const state = results[s.id];
          const r = (state && state !== 'loading') ? state as Result : null;
          return (
            <div key={s.id} className="card" style={{ padding:22, borderColor: r ? `${s.color}33` : undefined }}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <strong style={{ color:'white', fontSize:16 }}>{s.name}</strong>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:50, fontWeight:700,
                      background:`${sevColor(s.severity)}22`, color:sevColor(s.severity), border:`1px solid ${sevColor(s.severity)}44` }}>
                      {s.severity}
                    </span>
                  </div>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, margin:0 }}>{s.desc}</p>
                </div>
              </div>

              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'8px 12px', marginBottom:12,
                            display:'flex', gap:20, flexWrap:'wrap' }}>
                {[['Amount',`${s.tx.value_eth} ETH`],['Txns/10m',s.tx.tx_count_10min],['Z-score',s.tx.amount_zscore],['Gas',`${s.tx.gas_price_gwei} Gwei`]].map(([l,v])=>(
                  <span key={String(l)}><span style={{color:'rgba(255,255,255,0.3)',fontSize:11}}>{l}: </span><span style={{color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600}}>{v}</span></span>
                ))}
              </div>

              {r && (
                <div style={{ background:`${s.color}11`, border:`1px solid ${s.color}44`, borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ color:s.color, fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                      <FaExclamationTriangle /> {r.anomaly_type.replace(/_/g,' ')}
                    </span>
                    <span style={{ color:s.color, fontSize:18, fontWeight:800 }}>{r.risk_score.toFixed(0)}<span style={{color:'rgba(255,255,255,0.3)',fontSize:11}}>/100</span></span>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:4, height:5, marginBottom:8 }}>
                    <div style={{ width:`${r.risk_score}%`, height:'100%', background:s.color, borderRadius:4, transition:'width 0.6s ease' }} />
                  </div>
                  <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:0 }}>{r.explanation}</p>
                </div>
              )}

              <button onClick={()=>runScenario(s)} disabled={state==='loading'}
                style={{ background:`${s.color}18`, border:`1px solid ${s.color}44`, borderRadius:8,
                         padding:'8px 18px', color:s.color, cursor:'pointer', fontSize:13, fontWeight:600,
                         display:'flex', alignItems:'center', gap:7 }}>
                {state==='loading'
                  ? <><FaSpinner style={{animation:'spin-slow 1s linear infinite'}}/>Analyzing…</>
                  : <><FaPlay/>Run Test</>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding:20, marginTop:28 }}>
        <p style={{ color:'#8ddca4', fontWeight:700, fontSize:14, margin:'0 0 10px' }}>🤖 Models Used</p>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          {[['Isolation Forest','Anomaly scoring','#8ddca4'],['XGBoost','Type classification','#60a5fa'],['DBSCAN','Behavioral clustering','#c084fc'],['Rolling Window','10-min features','#f59e0b']].map(([m,t,c])=>(
            <span key={m}><span style={{color:c,fontWeight:600,fontSize:13}}>{m}</span><span style={{color:'rgba(255,255,255,0.35)',fontSize:12}}> — {t}</span></span>
          ))}
        </div>
      </div>
    </main>
  );
}
