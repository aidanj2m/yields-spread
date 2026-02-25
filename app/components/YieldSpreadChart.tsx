'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface YieldRow {
  date: string;
  treasury_10y: number;
  muni_yield: number;
  spread_bps: number;
  muni_treasury_ratio: number;
}

const RANGES = [
  { label: '1Y', days: 365 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
  { label: '10Y', days: 3650 },
];

function startDateForDays(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

function tickLabel(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (days <= 365)  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days <= 1825) return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return String(d.getFullYear());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1.5 font-medium text-zinc-500">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} className="tabular-nums" style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{Number(p.value).toFixed(2)}{p.name === 'Spread' ? ' bps' : '%'}</span>
        </p>
      ))}
    </div>
  );
}

function StatCard({
  label, value, sub, valueClass = 'text-zinc-900 dark:text-zinc-50',
}: {
  label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function YieldSpreadChart() {
  const [data, setData]         = useState<YieldRow[]>([]);
  const [latest, setLatest]     = useState<YieldRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeRange, setActiveRange] = useState('5Y');

  // Stats always show the most recent row — fetched once, independently of the range.
  useEffect(() => {
    fetch(`/api/yields?start=${startDateForDays(10)}`)
      .then(r => r.json())
      .then(json => {
        const rows: YieldRow[] = json.data ?? [];
        if (rows.length > 0) setLatest(rows[rows.length - 1]);
      });
  }, []);

  const fetchData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/yields?start=${startDateForDays(days)}`);
      const json = await res.json();
      setData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const range = RANGES.find(r => r.label === activeRange)!;
    fetchData(range.days);
  }, [activeRange, fetchData]);
  const rangeDays = RANGES.find(r => r.label === activeRange)?.days ?? 1825;
  const fmt       = (v: string) => tickLabel(v, rangeDays);

  // For 10Y view, pin one tick per calendar year so no year is skipped
  const yearlyTicks: string[] | undefined = rangeDays >= 3650 && data.length > 0
    ? (() => {
        const seen = new Set<number>();
        const ticks: string[] = [];
        for (const row of data) {
          const yr = new Date(row.date).getFullYear();
          if (!seen.has(yr)) { seen.add(yr); ticks.push(row.date); }
        }
        return ticks;
      })()
    : undefined;

  const gridColor  = 'var(--chart-grid, #e4e4e7)';
  const tickStyle  = { fontSize: 11, fill: '#71717a' };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Muni / Treasury Spread
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AAA 10-Year Municipal vs 10-Year Treasury · Daily · Source: FRED
          </p>
        </div>

        {/* Stats */}
        {latest && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Treasury 10Y"    value={`${latest.treasury_10y.toFixed(2)}%`} />
            <StatCard label="Muni AAA 10Y"    value={`${latest.muni_yield.toFixed(2)}%`} />
            <StatCard
              label="Spread"
              value={`${latest.spread_bps > 0 ? '+' : ''}${latest.spread_bps.toFixed(0)} bps`}
              valueClass={latest.spread_bps > 0 ? 'text-emerald-500' : 'text-red-500'}
              sub="treasury − muni"
            />
            <StatCard
              label="Muni Ratio"
              value={`${latest.muni_treasury_ratio.toFixed(1)}%`}
              sub="muni ÷ treasury"
            />
          </div>
        )}

        {/* Range selector */}
        <div className="flex items-center gap-1">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setActiveRange(r.label)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                activeRange === r.label
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              }`}
            >
              {r.label}
            </button>
          ))}
          {loading && <span className="ml-2 text-xs text-zinc-400">Loading…</span>}
        </div>

        {!loading && data.length > 0 && (
          <>
            {/* Yield comparison */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">
                Yield (%)
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={60} ticks={yearlyTicks} />
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={42} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="treasury_10y" name="Treasury 10Y"  stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="muni_yield"   name="Muni AAA 10Y" stroke="#10b981" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Spread */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
                Spread (bps)
              </p>
              <p className="mb-4 text-xs text-zinc-400">
                Treasury − Muni · positive = munis yield less (normal) · negative = stress / cheapening event
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={60} ticks={yearlyTicks} />
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={42} />
                  <ReferenceLine y={0} stroke="#71717a" strokeDasharray="4 4" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="spread_bps" name="Spread" stroke="#8b5cf6" fill="url(#spreadGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
