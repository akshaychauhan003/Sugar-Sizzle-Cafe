'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errMsg, money } from '@/lib/api';
import { Spinner } from '@/components/shared/ui';

export default function OrgStockOverviewCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let active = true;
    api('/reports/sales-graphs')
      .then((res) => {
        if (active) {
          setData(res.graphs?.orgStockOverview || null);
          setErr('');
        }
      })
      .catch((e) => {
        if (active) setErr(errMsg(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading && !data) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load stock data: {err}</div>;
  if (!data) return null;

  return (
    <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>📦 Organization Stock &amp; Inventory Assets</h3>
            <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>
              Live Inventory
            </span>
          </div>
          <p className="muted small" style={{ margin: '3px 0 0' }}>
            Executive stock valuation, perishable batch expiration status, and wastage tracking
          </p>
        </div>

        <div className="row wrap" style={{ gap: '8px' }}>
          <Link href="/menu?tab=stocks" className="btn sm primary">
            📦 Manage All Stock Items
          </Link>
          <Link href="/menu?tab=menu" className="btn sm">
            🍽️ Dish Prices &amp; Recipes
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Stock Valuation */}
        <div
          style={{
            padding: '14px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderRadius: '10px',
            border: '1px solid #a7f3d0',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>
            TOTAL STOCK VALUATION
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857', margin: '4px 0' }}>
            {money(data.totalValuation)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#065f46' }}>
            Across {data.totalItems} active ingredient batches
          </div>
        </div>

        {/* Healthy Batches */}
        <div
          style={{
            padding: '14px',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1.5px solid var(--border-light)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            🟢 HEALTHY BATCHES
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857', margin: '4px 0' }}>
            {data.healthyCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669' }}>
            Expiry &gt; 7 days away
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          style={{
            padding: '14px',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1.5px solid #fde68a',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b45309' }}>
            🟡 EXPIRING SOON (&le;7d)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {data.expiringSoonCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#92400e' }}>
            Needs priority kitchen usage
          </div>
        </div>

        {/* Expired Batches */}
        <div
          style={{
            padding: '14px',
            background: '#ffffff',
            borderRadius: '10px',
            border: data.expiredCount > 0 ? '1.5px solid #fca5a5' : '1.5px solid var(--border-light)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>
            🔴 EXPIRED BATCHES
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
            {data.expiredCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
            {data.expiredCount > 0 ? 'Action required: Waste/Dispose' : 'Zero expired batches'}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          style={{
            padding: '14px',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1.5px solid var(--border-light)',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            ⚠️ CRITICAL LOW STOCK
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
            {data.lowStockCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Below reorder threshold
          </div>
        </div>

        {/* Spoilage Loss */}
        <div
          style={{
            padding: '14px',
            background: '#fef2f2',
            borderRadius: '10px',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>
            SPOILAGE / WASTAGE LOSS
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
            {money(data.totalWastedLoss)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#991b1b' }}>
            Total value of wasted stock
          </div>
        </div>
      </div>
    </div>
  );
}
