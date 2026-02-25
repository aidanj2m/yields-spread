import { NextResponse } from 'next/server';
import { seedHistoricalYields } from '../../endpoints/yieldsEndpoints';

/**
 * POST /api/yields/seed
 * Fetches 10 years of treasury + muni data from FRED and upserts into Supabase.
 * Run this once (or to refresh) — subsequent calls are safe due to upsert.
 */
export async function POST() {
  try {
    const result = await seedHistoricalYields();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
