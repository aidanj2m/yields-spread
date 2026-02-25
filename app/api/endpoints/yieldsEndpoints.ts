import { fetchFredSeries, FRED_SERIES } from '../services/fredServices';
import { upsertYieldData, getYieldData, YieldRow } from '../services/Supabase';

/**
 * Fetch 10 years of treasury + muni data from FRED, compute the spread,
 * and upsert everything into Supabase.
 *
 * Returns the number of rows written.
 */
export async function seedHistoricalYields(): Promise<{ rowsWritten: number }> {
  const endDate   = new Date().toISOString().split('T')[0];
  const startDate = `${new Date().getFullYear() - 10}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const [treasuryMap, muniMap] = await Promise.all([
    fetchFredSeries(FRED_SERIES.TREASURY_10Y, startDate, endDate),
    fetchFredSeries(FRED_SERIES.MUNI_YIELD,   startDate, endDate),
  ]);

  // Only include dates where both series have a value
  const dates = [...treasuryMap.keys()].filter(d => muniMap.has(d)).sort();

  const rows: YieldRow[] = dates.map(date => {
    const treasury = treasuryMap.get(date)!;
    const muni     = muniMap.get(date)!;
    const spread   = parseFloat((muni - treasury).toFixed(4));

    return {
      date,
      treasury_10y:        treasury,
      muni_yield:          muni,
      spread,
      spread_bps:          parseFloat((spread * 100).toFixed(2)),
      muni_treasury_ratio: parseFloat(((muni / treasury) * 100).toFixed(4)),
    };
  });

  // Supabase upsert limit is 1000 rows per call — batch in chunks
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await upsertYieldData(rows.slice(i, i + CHUNK_SIZE));
  }

  return { rowsWritten: rows.length };
}

/**
 * Fetch the most recent ~10 days from FRED and upsert into Supabase.
 * Safe to call daily — handles weekends/holidays by using a wider window.
 */
export async function updateRecentYields(): Promise<{ rowsWritten: number }> {
  const endDate   = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [treasuryMap, muniMap] = await Promise.all([
    fetchFredSeries(FRED_SERIES.TREASURY_10Y, startDate, endDate),
    fetchFredSeries(FRED_SERIES.MUNI_YIELD,   startDate, endDate),
  ]);

  const dates = [...treasuryMap.keys()].filter(d => muniMap.has(d)).sort();

  const rows: YieldRow[] = dates.map(date => {
    const treasury = treasuryMap.get(date)!;
    const muni     = muniMap.get(date)!;
    const spread   = parseFloat((muni - treasury).toFixed(4));
    return {
      date,
      treasury_10y:        treasury,
      muni_yield:          muni,
      spread,
      spread_bps:          parseFloat((spread * 100).toFixed(2)),
      muni_treasury_ratio: parseFloat(((muni / treasury) * 100).toFixed(4)),
    };
  });

  if (rows.length > 0) await upsertYieldData(rows);
  return { rowsWritten: rows.length };
}

export { getYieldData };
