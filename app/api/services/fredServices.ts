const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

// FRED series IDs used in this project
export const FRED_SERIES = {
  TREASURY_10Y: 'DGS10',       // 10-Year Treasury Constant Maturity Rate
  MUNI_YIELD:   'AAA10Y',      // S&P Municipal Bond 10-Year High Grade Rate Index
} as const;

interface FredObservation {
  date: string;   // 'YYYY-MM-DD'
  value: string;  // numeric string, or '.' when missing
}

interface FredResponse {
  observations: FredObservation[];
}

/**
 * Fetch a FRED series and return a Map of { date -> value }.
 * Dates where FRED returns '.' (no data) are omitted.
 */
export async function fetchFredSeries(
  seriesId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY is not set — add it to yield-spread/.env');

  const params = new URLSearchParams({
    series_id:           seriesId,
    api_key:             apiKey,
    file_type:           'json',
    observation_start:   startDate,
    observation_end:     endDate,
  });

  const res = await fetch(`${FRED_BASE_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`FRED API error for ${seriesId}: ${res.status} ${res.statusText} — ${body}`);
  }

  const data: FredResponse = await res.json();
  const result = new Map<string, number>();

  for (const obs of data.observations) {
    if (obs.value !== '.') {
      result.set(obs.date, parseFloat(obs.value));
    }
  }

  return result;
}
