export default function NotFound() {
  return (
    <main style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060a14', color: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '12px' }}>📺</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Kiosk Not Found</h1>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>This display URL is invalid. Please use /display/&lt;businessId&gt;</p>
      </div>
    </main>
  );
}
