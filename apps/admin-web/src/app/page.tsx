'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OverviewStats {
  total_businesses: number;
  active_queues: number;
  total_tokens_today: number;
  mrr_inr: number;
  pending_grievances: number;
}

interface BusinessItem {
  id: string;
  name: string;
  category: string;
  address: string;
  verified: boolean;
  status: string;
  plan: string;
  created_at: string;
}

interface GrievanceItem {
  id: string;
  customer_mobile: string;
  customer_name?: string;
  business_name?: string;
  issue_type: string;
  description: string;
  status: string;
  resolution_note?: string;
  created_at: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.mahira-traders.com';
const ADMIN_KEY = 'queueless-super-secret-admin-2025';

export default function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'businesses' | 'categories' | 'grievances'>('overview');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏪');

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-admin-key': ADMIN_KEY };
      const [statsRes, bizRes, grivRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/overview`, { headers }),
        fetch(`${API_BASE}/api/v1/admin/businesses`, { headers }),
        fetch(`${API_BASE}/api/v1/admin/grievances`, { headers }),
        fetch(`${API_BASE}/api/v1/admin/categories`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (bizRes.ok) setBusinesses(await bizRes.json());
      if (grivRes.ok) setGrievances(await grivRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleVerify = async (id: string) => {
    await fetch(`${API_BASE}/api/v1/admin/businesses/${id}/verify`, {
      method: 'PATCH',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    loadData();
  };

  const toggleSuspend = async (id: string) => {
    await fetch(`${API_BASE}/api/v1/admin/businesses/${id}/suspend`, {
      method: 'PATCH',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    loadData();
  };

  const changePlan = async (id: string, plan: string) => {
    await fetch(`${API_BASE}/api/v1/admin/businesses/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ plan }),
    });
    loadData();
  };

  const resolveGrievance = async (id: string, status: string) => {
    const note = prompt('Enter resolution note:', 'Resolved by Super Admin');
    if (!note) return;
    await fetch(`${API_BASE}/api/v1/admin/grievances/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ status, resolution_note: note }),
    });
    loadData();
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    await fetch(`${API_BASE}/api/v1/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      body: JSON.stringify({ name: newCatName, slug: newCatSlug, icon: newCatIcon, display_order: categories.length + 1 }),
    });
    setNewCatName('');
    setNewCatSlug('');
    loadData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await fetch(`${API_BASE}/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    loadData();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#0e1626', borderBottom: '1px solid #1e293b', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', marginRight: '10px' }}>
            SUPER ADMIN
          </span>
          <h1 style={{ display: 'inline', fontSize: '22px', fontWeight: 800 }}>QueueLess India Control Portal</h1>
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>
          Secure Portal v1.0 • Connected to Backend API
        </div>
      </header>

      {/* Nav Tabs */}
      <nav style={{ display: 'flex', gap: '12px', padding: '20px 32px', background: '#0b111e', borderBottom: '1px solid #1e293b' }}>
        {[
          { key: 'overview', label: '📊 Overview & MRR' },
          { key: 'businesses', label: '🏪 Business Moderation' },
          { key: 'categories', label: '📂 Category Manager' },
          { key: 'grievances', label: `⚠️ Complaints (${stats?.pending_grievances ?? 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              background: tab === t.key ? '#2563eb' : '#131e36',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading && <div style={{ color: '#64748b' }}>Loading super admin data…</div>}

        {/* OVERVIEW TAB */}
        {!loading && tab === 'overview' && stats && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Platform Metrics & Revenue</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Total Businesses</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8', marginTop: '8px' }}>{stats.total_businesses}</div>
              </div>
              <div style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Active Queues Now</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#34d399', marginTop: '8px' }}>{stats.active_queues}</div>
              </div>
              <div style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Tokens Issued Today</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#fbbf24', marginTop: '8px' }}>{stats.total_tokens_today}</div>
              </div>
              <div style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Monthly MRR</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#a78bfa', marginTop: '8px' }}>₹{stats.mrr_inr.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        )}

        {/* BUSINESSES TAB */}
        {!loading && tab === 'businesses' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Merchant Moderation & Subscription Management</h2>
            <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#131e36', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
                    <th style={{ padding: '16px' }}>Business Name</th>
                    <th style={{ padding: '16px' }}>Category</th>
                    <th style={{ padding: '16px' }}>Status</th>
                    <th style={{ padding: '16px' }}>Verified (Blue Tick)</th>
                    <th style={{ padding: '16px' }}>Plan</th>
                    <th style={{ padding: '16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '16px', fontWeight: 700 }}>{b.name}</td>
                      <td style={{ padding: '16px', color: '#94a3b8' }}>{b.category}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: b.status === 'suspended' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: b.status === 'suspended' ? '#f87171' : '#34d399'
                        }}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => toggleVerify(b.id)}
                          style={{
                            background: b.verified ? '#2563eb' : '#1e293b',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          {b.verified ? '✓ Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <select
                          value={b.plan}
                          onChange={(e) => changePlan(b.id, e.target.value)}
                          style={{ background: '#131e36', color: '#fff', border: '1px solid #334155', padding: '6px 10px', borderRadius: '8px' }}
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter (₹999)</option>
                          <option value="pro">Pro (₹2499)</option>
                          <option value="enterprise">Enterprise (₹7999)</option>
                        </select>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => toggleSuspend(b.id)}
                          style={{
                            background: b.status === 'suspended' ? '#10b981' : '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          {b.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {!loading && tab === 'categories' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Category Manager</h2>
            <form onSubmit={createCategory} style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#0e1626', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <input
                type="text"
                placeholder="Category Name (e.g. Dental)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ background: '#131e36', border: '1px solid #334155', color: '#fff', padding: '10px 14px', borderRadius: '8px', flex: 1 }}
              />
              <input
                type="text"
                placeholder="Slug (e.g. dental)"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                style={{ background: '#131e36', border: '1px solid #334155', color: '#fff', padding: '10px 14px', borderRadius: '8px', width: '180px' }}
              />
              <input
                type="text"
                placeholder="Icon emoji"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                style={{ background: '#131e36', border: '1px solid #334155', color: '#fff', padding: '10px 14px', borderRadius: '8px', width: '90px', textAlign: 'center' }}
              />
              <button type="submit" style={{ background: '#10b981', color: '#090d16', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                Add Category
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {categories.map((c) => (
                <div key={c.id} style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '32px' }}>{c.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>{c.name}</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>slug: {c.slug}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteCategory(c.id)} style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GRIEVANCES TAB */}
        {!loading && tab === 'grievances' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Customer Complaints & Grievance Redressal</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {grievances.map((g) => (
                <div key={g.id} style={{ background: '#0e1626', border: '1px solid #1e293b', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                        {g.issue_type.toUpperCase()}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>Customer: +91 {g.customer_mobile} {g.customer_name ? `(${g.customer_name})` : ''}</span>
                      {g.business_name && <span style={{ color: '#38bdf8', fontSize: '13px' }}>• Business: {g.business_name}</span>}
                    </div>
                    <p style={{ fontSize: '15px', color: '#e2e8f0', margin: '8px 0' }}>{g.description}</p>
                    {g.resolution_note && (
                      <div style={{ marginTop: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px 14px', borderRadius: '8px', color: '#34d399', fontSize: '13px' }}>
                        <strong>Resolution:</strong> {g.resolution_note}
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ display: 'block', textAlign: 'right', marginBottom: '10px', fontWeight: 700, color: g.status === 'pending' ? '#fbbf24' : '#34d399', fontSize: '13px' }}>
                      {g.status.toUpperCase()}
                    </span>
                    {g.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => resolveGrievance(g.id, 'resolved')} style={{ background: '#10b981', color: '#090d16', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                          Resolve
                        </button>
                        <button onClick={() => resolveGrievance(g.id, 'dismissed')} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {grievances.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No grievances reported. All clear! 🎉</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
