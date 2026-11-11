import Link from "next/link";

export type Role = "tenant" | "linda" | "marco";

const ROLES: { role: Role; name: string; who: string }[] = [
  { role: "tenant", name: "Tenant", who: "reports" },
  { role: "linda", name: "Linda", who: "landlord" },
  { role: "marco", name: "Marco", who: "handyman" },
];

/** Where each role lands. On a job, Linda and Marco stay on the same job. */
function hrefFor(role: Role, jobId?: string) {
  if (role === "tenant" || !jobId) return `/${role}`;
  return `/${role}/jobs/${jobId}`;
}

export function TopBar({ role, jobId }: { role: Role; jobId?: string }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="wordmark">
          Mendly
        </Link>
        <nav className="role-switch" aria-label="Viewing as">
          <span className="role-switch-label">Viewing as</span>
          {ROLES.map((r) => (
            <Link
              key={r.role}
              href={hrefFor(r.role, jobId)}
              className={r.role === role ? "role active" : "role"}
              aria-current={r.role === role ? "page" : undefined}
            >
              {r.name}
              <span className="role-who">{r.who}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
