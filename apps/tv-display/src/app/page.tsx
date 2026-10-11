'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [bizId, setBizId] = useState('');

  const handleLaunch = (id: string) => {
    if (!id.trim()) return;
    router.push(`/display/${encodeURIComponent(id.trim())}`);
  };

  const demoBusinesses = [
    { id: 'surat_apollo_101', name: 'Apollo Clinic & Diagnostics', city: 'Surat' },
    { id: 'ahmd_shreeji_102', name: 'Shreeji Hair Lounge & Spa', city: 'Ahmedabad' },
    { id: 'delhi_care_103', name: 'Max Health Multi-Speciality', city: 'Delhi' },
  ];

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #060a14 100%)'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#0d1527',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(6, 182, 212, 0.1)',
            color: '#06b6d4',
            padding: '6px 14px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px'
          }}>
            📺 Waiting Hall TV Display Mode
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
            QueueLess TV Kiosk
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Full-screen waiting hall board with 20-ft visibility, audio chimes, and instant multilingual voice announcements.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleLaunch(bizId); }} style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', fontWeight: 600, marginBottom: '8px' }}>
            Enter Business ID:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="e.g. surat_apollo_101 or your Business ID"
              value={bizId}
              onChange={(e) => setBizId(e.target.value)}
              style={{
                flex: 1,
                background: '#060a14',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#f8fafc',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!bizId.trim()}
              style={{
                background: '#06b6d4',
                color: '#060a14',
                fontWeight: 700,
                border: 'none',
                borderRadius: '12px',
                padding: '0 24px',
                cursor: bizId.trim() ? 'pointer' : 'not-allowed',
                opacity: bizId.trim() ? 1 : 0.6,
                fontSize: '15px'
              }}
            >
              Launch TV 🚀
            </button>
          </div>
        </form>

        <div>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Or Launch Demo Waiting Hall:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {demoBusinesses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleLaunch(b.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#131e36',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#f1f5f9',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <span>{b.name} <span style={{ color: '#64748b', fontSize: '12px' }}>({b.city})</span></span>
                <span style={{ color: '#06b6d4', fontSize: '13px' }}>Open Display →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
