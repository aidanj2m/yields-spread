import { NextRequest, NextResponse } from 'next/server';
import { updateRecentYields } from '../../endpoints/yieldsEndpoints';

/**
 * GET /api/yields/update
 * Called daily by Vercel Cron (vercel.json schedule: "0 22 * * 1-5").
 * Fetches the last ~10 days from FRED and upserts any new rows.
 *
 * Secured by CRON_SECRET — Vercel automatically injects this as an
 * Authorization: Bearer <secret> header on cron invocations.
 * Set CRON_SECRET in your Vercel environment variables.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await updateRecentYields();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
