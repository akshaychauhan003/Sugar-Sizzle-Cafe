'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, download, errMsg } from '@/lib/api';
import { useAuth, useToast } from '@/components/shared/AuthProvider';
import { Empty, ErrorBox, Spinner } from '@/components/shared/ui';
import MenuStatsCards from './MenuStatsCards';
import MenuFilterBar from './MenuFilterBar';
import MenuTable from './MenuTable';
import MenuItemModal from './MenuItemModal';
import StockManager from '@/components/shared/StockManager';
import UserManager from '@/components/shared/UserManager';

export default function MenuPage() {
  const { user } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(tabParam && ['menu', 'stocks', 'users'].includes(tabParam) ? tabParam : 'menu'); // 'menu' | 'stocks' | 'users'

  useEffect(() => {
    if (tabParam && ['menu', 'stocks', 'users'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ total: 0, available: 0, unavailable: 0 });
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(undefined);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page, limit: '10' });
    if (q.trim()) p.set('q', q.trim());
    if (cat) p.set('category', cat);
    if (status === 'available') p.set('available', 'true');
    if (status === 'unavailable') p.set('available', 'false');
    if (isAdmin) p.set('includeInactive', 'true');
    try {
      const r = await api(`/menu?${p}`);
      setData(r.data);
      setMeta(r.meta);
      setErr('');
      api('/menu/categories').then((c) => setCats(c.data)).catch(() => {});
      const [all, avail, oos] = await Promise.all([
        api(`/menu?limit=1${isAdmin ? '&includeInactive=true' : ''}`),
        api('/menu?limit=1&available=true'),
        api('/menu?limit=1&available=false'),
      ]);
      setStats({ total: all.meta.total, available: avail.meta.total, unavailable: oos.meta.total });
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [page, q, cat, status, isAdmin]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => setPage(1), [q, cat, status]);

  async function toggle(i) {
    try {
      await api(`/menu/${i.id}/availability`, { method: 'PATCH', body: { isAvailable: !i.isAvailable } });
      toast(`${i.name} ${i.isAvailable ? 'marked out of stock' : 'is available again'}`);
      load();
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  async function deactivate(i) {
    if (
      !window.confirm(
        `Deactivate "${i.name}"? It will disappear from the POS. Past orders are not affected.`,
      )
    )
      return;
    try {
      await api(`/menu/${i.id}`, { method: 'DELETE' });
      toast('Item deactivated');
      load();
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  async function reactivate(i) {
    try {
      await api(`/menu/${i.id}`, {
        method: 'PUT',
        body: { isActive: true, isAvailable: true, stockStatus: 'in_stock' },
      });
      toast('Item reactivated');
      load();
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  async function exportCsv() {
    try {
      await download('/menu/export.csv', 'menu-export.csv');
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  return (
    <div>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h2>Menu &amp; Operational Hub</h2>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Set dish prices, track perishable stock purchases &amp; expiry, and manage user roles
          </p>
        </div>

        {/* Admin Tabs */}
        <div className="row wrap" style={{ gap: '6px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'menu' ? 'primary' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            🍽️ Dishes &amp; Pricing
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'stocks' ? 'primary' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Stocks &amp; Expiry
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`btn ${activeTab === 'users' ? 'primary' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Staff &amp; Roles
            </button>
          )}

          {activeTab === 'menu' && isAdmin && (
            <>
              <button className="btn" onClick={exportCsv}>
                Export CSV
              </button>
              <button className="btn primary" onClick={() => setEdit(null)}>
                + Add Dish
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'stocks' ? (
        <StockManager role={isAdmin ? 'admin' : 'staff'} />
      ) : activeTab === 'users' ? (
        <UserManager />
      ) : (
        <>
          <MenuStatsCards stats={stats} />

          <MenuFilterBar
            q={q}
            setQ={setQ}
            cat={cat}
            setCat={setCat}
            cats={cats}
            status={status}
            setStatus={setStatus}
          />

          {err && <ErrorBox message={err} onRetry={load} />}

          {!data ? (
            <Spinner />
          ) : data.length === 0 ? (
            <Empty>No menu items found.</Empty>
          ) : (
            <MenuTable
              data={data}
              isAdmin={isAdmin}
              meta={meta}
              page={page}
              setPage={setPage}
              onToggle={toggle}
              onDeactivate={deactivate}
              onReactivate={reactivate}
              onEdit={(i) => setEdit(i)}
            />
          )}

          {edit !== undefined && (
            <MenuItemModal
              item={edit}
              onClose={() => setEdit(undefined)}
              onSaved={() => {
                setEdit(undefined);
                load();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
