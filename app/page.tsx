export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 16px" }}>
      <h1 style={{ color: "var(--brand)", marginBottom: 8 }}>Mendly</h1>
      <p>Repairs get verified by AI and paid through PayPal in minutes.</p>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        The full entry page comes later in the build. For now, pick a role:
      </p>
      <p style={{ display: "flex", gap: 16 }}>
        <a href="/tenant">Tenant →</a>
        <a href="/linda">Linda →</a>
        <a href="/marco">Marco →</a>
      </p>
    </main>
  );
}
