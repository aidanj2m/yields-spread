'use client';

import dynamic from 'next/dynamic';

const YieldSpreadChart = dynamic(
  () => import('./components/YieldSpreadChart'),
  { ssr: false }
);

export default function Home() {
  return <YieldSpreadChart />;
}
