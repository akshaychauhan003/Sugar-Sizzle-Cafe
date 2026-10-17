'use client';
import { money } from '@/lib/api';

export default function HourlyRevenueChart({ hourly = [] }) {
  const max = Math.max(1, ...hourly.map((h) => h.netSales));

  return (
    <div className="chart" aria-label="Hourly revenue chart">
      {hourly.map((h) => {
        const pct = Math.round((h.netSales / max) * 100);
        return (
          <div key={h.hour} className="bar-col" title={`${h.label}: ${money(h.netSales)} (${h.orders} orders)`}>
            <div className="bar-val small muted">{h.netSales > 0 ? money(h.netSales).replace('.00', '') : ''}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <div className="bar-lbl">{h.label}</div>
          </div>
        );
      })}
    </div>
  );
}
