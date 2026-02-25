import { NextRequest, NextResponse } from 'next/server';
import { getYieldData } from '../endpoints/yieldsEndpoints';

/**
 * GET /api/yields
 * Returns stored yield_data rows.
 * Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const start = searchParams.get('start') ?? undefined;
    const end   = searchParams.get('end')   ?? undefined;

    const data = await getYieldData(start, end);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
