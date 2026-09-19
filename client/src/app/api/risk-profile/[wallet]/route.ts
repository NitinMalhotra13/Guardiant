import { NextRequest, NextResponse } from 'next/server';

const ML_API = process.env.ML_API_URL || 'http://127.0.0.1:5001';

export async function GET(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const { wallet } = params;
  if (!wallet.startsWith('0x') || wallet.length !== 42) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  try {
    const res = await fetch(`${ML_API}/api/risk-profile/${wallet}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return NextResponse.json({ error: 'ML error' }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({
      wallet, risk_factor: 5, risk_label: 'MEDIUM',
      contamination: 0.10, ml_offline: true,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const { wallet } = params;
  const body = await req.json();
  const factor = Number(body.risk_factor);
  if (!Number.isInteger(factor) || factor < 1 || factor > 10) {
    return NextResponse.json({ error: 'risk_factor must be 1-10' }, { status: 400 });
  }
  try {
    const res = await fetch(`${ML_API}/api/set-risk-factor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, risk_factor: factor }),
      signal: AbortSignal.timeout(4000),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ wallet, risk_factor: factor, ml_offline: true });
  }
}
