import { NextRequest, NextResponse } from 'next/server';

const ML_API = process.env.ML_API_URL || 'http://127.0.0.1:5001';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id) || id < 1 || id > 8) {
    return NextResponse.json({ error: 'Scenario ID must be 1-8' }, { status: 400 });
  }
  try {
    const res = await fetch(`${ML_API}/api/test-scenario/${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: 'ML error' }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'ML service offline' }, { status: 503 });
  }
}
