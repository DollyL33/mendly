import Link from "next/link";

const ROLES = [
  { href: "/linda", name: "Linda", role: "Landlord", line: "Approve and fund repairs from anywhere.", cta: "Enter as Linda" },
  { href: "/marco", name: "Marco", role: "Handyman", line: "Do the job, upload proof, get paid.", cta: "Enter as Marco" },
  { href: "/tenant", name: "The tenant", role: "Renter", line: "Report a problem, see when it's fixed.", cta: "Enter as tenant" },
];

export default function Home() {
  return (
    <main className="entry">
      <header className="entry-head">
        <p className="wordmark entry-mark">Mendly</p>
        <h1 className="entry-title">Repairs get verified by AI and paid through PayPal in minutes.</h1>
        <p className="entry-lede">
          For landlords who manage their own rentals. The agent plans the job, checks the handyman's proof photos, and
          pays through PayPal within your limit. It only asks you when something needs a human.
        </p>
      </header>

      <ol className="story">
        <li>
          <span className="story-num mono">1</span>
          <p className="story-title">Reported</p>
          <p className="story-copy">The tenant sends a photo. The agent plans the job and the price.</p>
        </li>
        <li>
          <span className="story-num mono">2</span>
          <p className="story-title">Fixed and proven</p>
          <p className="story-copy">Linda approves once in PayPal; the money is held. Marco sends proof photos.</p>
        </li>
        <li>
          <span className="story-num mono">3</span>
          <p className="story-title">Verified and paid</p>
          <p className="story-copy">The agent checks each photo. Rules in code pay Marco, or ask Linda.</p>
        </li>
      </ol>

      <div className="entry-start">
        <Link href="/tenant" className="button entry-button">
          Start the guided demo →
        </Link>
        <p className="muted small">About 3 minutes. Uses the PayPal sandbox: no real money moves.</p>
      </div>

      <ul className="role-cards">
        {ROLES.map((r) => (
          <li key={r.href} className="card role-card">
            <p className="role-card-name">{r.name}</p>
            <p className="role-card-role">{r.role}</p>
            <p className="role-card-line">{r.line}</p>
            <Link href={r.href} className="button-quiet">
              {r.cta} →
            </Link>
          </li>
        ))}
      </ul>

      <p className="entry-foot muted small">
        Built for the Build What&apos;s Next with PayPal and AI hackathon. AI: Claude. Payments: PayPal sandbox.
      </p>
    </main>
  );
}
