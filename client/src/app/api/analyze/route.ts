// Next.js API route: proxy to Python ML API
// Adds server-side validation before forwarding to the ML service

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ML_API = process.env.ML_API_URL || 'http://127.0.0.1:5001';

const TxSchema = z.object({
  wallet:           z.string().startsWith('0x').length(42),
  from_address:     z.string().optional(),
  to_address:       z.string().optional(),
  value_eth:        z.number().min(0).max(1_000_000),
  gas_used:         z.number().int().min(0).optional(),
  gas_price_gwei:   z.number().min(0).optional(),
  hour_utc:         z.number().int().min(0).max(23).optional(),
  day_of_week:      z.number().int().min(0).max(6).optional(),
  is_new_recipient: z.number().int().min(0).max(1).optional(),
  is_round_amount:  z.number().int().min(0).max(1).optional(),
  tx_count_10min:   z.number().int().min(0).optional(),
  period_volume_eth:z.number().min(0).optional(),
  amount_zscore:    z.number().optional(),
  recipient_cluster:z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TxSchema.safeParse(body.transaction);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid transaction data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const res = await fetch(`${ML_API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: parsed.data }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'ML API error', details: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // ML API offline — return safe default (don't block user)
    if (err?.name === 'TimeoutError' || err?.code === 'ECONNREFUSED') {
      return NextResponse.json({
        result: { is_anomaly: false, risk_score: 0, anomaly_type: 'NONE', severity: 'NONE',
                  explanation: 'ML service offline — proceeding without analysis' },
        notification: null,
        ml_offline: true,
      });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
