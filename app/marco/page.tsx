import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { money } from "@/lib/format";
import { listJobs } from "@/lib/jobs";
import { marcoStatus, MARCO_VISIBLE } from "@/lib/marco";

export const dynamic = "force-dynamic";

export default async function MarcoPage() {
  const demo = await currentDemo();
  const jobs = listJobs(demo.id).filter((j) => MARCO_VISIBLE.has(j.status));

  return (
    <>
      <TopBar role="marco" />
      <main className="page narrow marco">
        <p className="eyebrow">Marco · handyman</p>
        <h1>Your jobs</h1>
        {jobs.length ? (
          <ul className="ticket-list">
            {jobs.map((job) => {
              const s = marcoStatus[job.status];
              return (
                <li key={job.id}>
                  <Link href={`/marco/jobs/${job.id}`} className={`card ticket-row tone-${s.tone}`}>
                    <div className="ticket-row-main">
                      <p className="ticket-meta mono">
                        #{job.number} · {job.address}
                        {job.is_sample ? " · Sample" : ""}
                      </p>
                      <p className="ticket-row-title">{job.title}</p>
                      <StatusPill label={s.label} tone={s.tone} />
                    </div>
                    <p className="ticket-row-amount money">{money(job.amount_cents)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">Jobs appear here once Linda has approved them and the money is held.</p>
        )}
      </main>
    </>
  );
}
