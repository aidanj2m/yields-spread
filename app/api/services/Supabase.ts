import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — created on first use so env vars are guaranteed to be loaded
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in .env');
    _client = createClient(url, key);
  }
  return _client;
}

export interface YieldRow {
  date:                 string;
  treasury_10y:         number | null;
  muni_yield:           number | null;
  spread:               number | null;
  spread_bps:           number | null;
  muni_treasury_ratio:  number | null;
}

/**
 * Upsert yield rows into yield_data.
 * Conflicts on `date` will update all value columns.
 */
export async function upsertYieldData(rows: YieldRow[]): Promise<void> {
  const { error } = await getClient()
    .from('yield_data')
    .upsert(rows, { onConflict: 'date' });

  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
}

/**
 * Fetch stored yield data, optionally filtered by date range.
 * Returns rows ordered oldest → newest.
 */
export async function getYieldData(
  startDate?: string,
  endDate?: string
): Promise<YieldRow[]> {
  let query = getClient()
    .from('yield_data')
    .select('date, treasury_10y, muni_yield, spread, spread_bps, muni_treasury_ratio')
    .order('date', { ascending: true });

  if (startDate) query = query.gte('date', startDate);
  if (endDate)   query = query.lte('date', endDate);

  const { data, error } = await query;
  if (error) throw new Error(`Supabase query error: ${error.message}`);

  return (data ?? []) as YieldRow[];
}
