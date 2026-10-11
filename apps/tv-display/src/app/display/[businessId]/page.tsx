'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  unlockAudioContext,
  playCallChime,
  playNoticeTone,
  speakAnnouncement,
} from '@/lib/kioskAudio';
import type {
  QueueStateSnapshot,
  KioskCallAnnouncement,
  KioskLanguage,
} from '@/lib/kioskTypes';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function fetchQueueState(businessId: string): Promise<QueueStateSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/businesses/${businessId}/queue`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      businessId,
      businessName: data.businessName ?? data.business?.name,
      currentToken: data.currentToken ?? data.current_token ?? 0,
      servingCounter: data.servingCounter ?? null,
      waiting: (data.waitingList ?? data.waiting ?? []).map((w: Record<string, unknown>) => ({
        tokenNumber: Number(w.tokenNumber ?? w.token_number ?? 0),
        customerName: String(w.customerName ?? w.customer_name ?? 'Customer'),
        serviceName: w.serviceName as string | undefined,
      })),
      waitingCount: data.waitingCount ?? data.waiting_count ?? 0,
      servedToday: data.servedToday ?? data.served_today ?? 0,
      skippedToday: data.skippedToday ?? data.skipped_today ?? 0,
      paused: Boolean(data.paused),
      shopStatus: data.shopStatus,
    };
  } catch {
    return null;
  }
}

export default function DisplayKioskPage() {
  const params = useParams();
  const businessId = String(params?.businessId ?? '');

  const [state, setState] = useState<QueueStateSnapshot | null>(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [nowServingFlash, setNowServingFlash] = useState(false);
  const [lang, setLang] = useState<KioskLanguage>('en');
  const [announcement, setAnnouncement] = useState<KioskCallAnnouncement | null>(null);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState<Date>(new Date());

  const wsRef = useRef<WebSocket | null>(null);
  const lastCalledTokenRef = useRef<number | null>(null);
  const audioStartedRef = useRef(audioStarted);
  const langRef = useRef(lang);
  useEffect(() => { audioStartedRef.current = audioStarted; }, [audioStarted]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial HTTP snapshot + WebSocket live sync
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    fetchQueueState(businessId).then((snap) => {
      if (!cancelled && snap) {
        setState(snap);
        lastCalledTokenRef.current = snap.currentToken;
      }
    });

    const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/queue/${businessId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (evt) => {
      let msg: { event: string; data: unknown };
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object' || !('event' in msg)) return;

      if (msg.event === 'QUEUE_STATE_CHANGED') {
        const d = msg.data as Record<string, unknown>;
        setState((prev) => ({
          businessId,
          businessName: (d.businessName as string) ?? prev?.businessName,
          currentToken: Number(d.currentToken ?? d.current_token ?? prev?.currentToken ?? 0),
          servingCounter: (d.servingCounter as QueueStateSnapshot['servingCounter']) ?? prev?.servingCounter ?? null,
          waiting: ((d.waitingList ?? d.waiting ?? []) as Record<string, unknown>[]).map((w) => ({
            tokenNumber: Number(w.tokenNumber ?? w.token_number ?? 0),
            customerName: String(w.customerName ?? w.customer_name ?? 'Customer'),
            serviceName: w.serviceName as string | undefined,
          })),
          waitingCount: Number(d.waitingCount ?? d.waiting_count ?? prev?.waitingCount ?? 0),
          servedToday: Number(d.servedToday ?? d.served_today ?? prev?.servedToday ?? 0),
          skippedToday: Number(d.skippedToday ?? d.skipped_today ?? prev?.skippedToday ?? 0),
          paused: Boolean(d.paused ?? prev?.paused),
          shopStatus: (d.shopStatus as string) ?? prev?.shopStatus,
        }));
      }

      if (msg.event === 'TOKEN_CALLED') {
        const call = msg.data as KioskCallAnnouncement;
        setAnnouncement(call);
        setNowServingFlash(true);
        setTimeout(() => setNowServingFlash(false), 1200);

        if (audioStartedRef.current) {
          playCallChime().then(() =>
            speakAnnouncement(call.announcement, langRef.current === 'hi' ? 'hi-IN' : 'en-IN')
          );
        }
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    return () => {
      cancelled = true;
      try { ws.close(); } catch { /* ignore */ }
    };
  }, [businessId]);

  // Fallback polling every 30s in case WS drops
  useEffect(() => {
    if (!businessId) return;
    const t = setInterval(async () => {
      const snap = await fetchQueueState(businessId);
      if (snap) setState(snap);
    }, 30000);
    return () => clearInterval(t);
  }, [businessId]);

  // Handle "Start Kiosk Audio" unlock
  const handleStartAudio = useCallback(async () => {
    unlockAudioContext();
    await playNoticeTone();
    setAudioStarted(true);
  }, []);

  // Compute upcoming 4 tokens ticker
  const upcoming = (state?.waiting ?? [])
    .filter((w) => w.tokenNumber > (state?.currentToken ?? 0))
    .slice(0, 4)
    .map((w) => `#${w.tokenNumber}`);

  const upcomingLabel = upcoming.length > 0 ? upcoming.join(' • ') : 'Queue is empty';

  return (
    <main style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #060a14 100%)',
      padding: '32px 40px',
      gap: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: '0 0 auto' }}>
        <div>
          <div style={{ color: '#06b6d4', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            📺 LIVE KIOSK {connected ? '● Connected' : '● Reconnecting…'}
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
            {state?.businessName || 'QueueLess Waiting Hall'}
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-grotesk" style={{ fontSize: '30px', fontWeight: 700, color: '#e2e8f0' }}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>
            {clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </header>

      {/* NOW SERVING display */}
      <section className={nowServingFlash ? 'call-animation' : ''} style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.02) 100%)',
        border: '2px solid rgba(6, 182, 212, 0.35)',
        borderRadius: '28px',
        padding: '40px',
        position: 'relative'
      }}>
        {!audioStarted && (
          <>
            <div style={{
              position: 'absolute', top: '20px', right: '24px',
              background: '#f59e0b',
              color: '#060a14',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '14px',
              maxWidth: '380px',
              textAlign: 'center'
            }}>
              🔊 Audio is locked — tap the green button to unlock voice announcements
            </div>
            <button
              onClick={handleStartAudio}
              style={{
                position: 'absolute',
                top: '64px',
                right: '24px',
                background: '#10b981',
                color: '#060a14',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(16,185,129,0.35)'
              }}
            >
              🔊 Start Kiosk Audio
            </button>
          </>
        )}

        <div style={{ color: '#94a3b8', fontSize: '26px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>
          NOW SERVING
        </div>
        <div className="font-grotesk" style={{
          fontSize: 'clamp(120px, 22vw, 260px)',
          fontWeight: 900,
          lineHeight: 1,
          color: '#22d3ee',
          textShadow: '0 0 60px rgba(34,211,238,0.4)'
        }}>
          #{state?.currentToken ?? 0}
        </div>
        {state?.servingCounter && (
          <div style={{
            marginTop: '18px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            padding: '12px 28px',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '100px',
            fontSize: '28px',
            fontWeight: 800
          }}>
            → {state.servingCounter.name}
          </div>
        )}
        {announcement && (
          <div style={{ marginTop: '14px', color: '#94a3b8', fontSize: '20px' }}>
            {lang === 'hi' ? announcement.announcement_hi : announcement.announcement}
            {announcement.customerName ? ` • ${announcement.customerName}` : ''}
          </div>
        )}
      </section>

      {/* Upcoming tokens ticker + Stats */}
      <footer style={{ display: 'flex', gap: '24px', flex: '0 0 auto' }}>
        <section style={{
          flex: 1,
          background: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '24px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <div style={{ color: '#64748b', fontSize: '16px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            UPCOMING
          </div>
          <div className="font-grotesk" style={{ fontSize: '54px', fontWeight: 900, color: '#fbbf24', letterSpacing: '2px' }}>
            {upcomingLabel}
          </div>
        </section>

        <section style={{
          width: '340px',
          background: '#0d1527',
          border: '1px solid #1e293b',
          borderRadius: '24px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ color: '#64748b', fontSize: '16px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            TODAY
          </div>
          <div style={{ display: 'flex', gap: '22px' }}>
            <div>
              <div className="font-grotesk" style={{ fontSize: '38px', fontWeight: 800, color: '#34d399' }}>
                {state?.servedToday ?? 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '13px' }}>Served</div>
            </div>
            <div>
              <div className="font-grotesk" style={{ fontSize: '38px', fontWeight: 800, color: '#93c5fd' }}>
                {state?.waitingCount ?? 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '13px' }}>Waiting</div>
            </div>
            <div>
              <div className="font-grotesk" style={{ fontSize: '38px', fontWeight: 800, color: '#f87171' }}>
                {state?.skippedToday ?? 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '13px' }}>Skipped</div>
            </div>
          </div>
        </section>
      </footer>

      {/* Language switch */}
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', display: 'flex', gap: '8px' }}>
        {(['en', 'hi', 'hinglish'] as KioskLanguage[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              background: lang === l ? '#06b6d4' : '#131e36',
              color: lang === l ? '#060a14' : '#94a3b8',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'Hinglish'}
          </button>
        ))}
      </div>
    </main>
  );
}
