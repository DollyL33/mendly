import Link from "next/link";
import { NextStepHint } from "@/components/NextStepHint";
import { nextStep } from "@/lib/hints";

import { LimitSetting } from "@/components/LimitSetting";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { lindaStatus, money, timeOf } from "@/lib/format";
import { getEvents, listJobs, type Job } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const NEEDS_YOU = new Set(["waiting_approval", "needs_linda"]);

function planFailed(job: Job) {
  return job.status === "reported" && getEvents(job.id).at(-1)?.kind === "plan_failed";
}

function TicketRow({ job }: { job: Job }) {
  const s = planFailed(job) ? { label: "Couldn't plan, try again", tone: "problem" as const } : lindaStatus[job.status];
  return (
    <li>
      <Link href={`/linda/jobs/${job.id}`} className={`card ticket-row tone-${s.tone}`}>
        <div className="ticket-row-main">
          <p className="ticket-meta mono">
            #{job.number} · {timeOf(job.created_at)}
            {job.is_sample ? " · Sample" : ""}
          </p>
          <p className="ticket-row-title">{job.title}</p>
          <StatusPill label={s.label} tone={s.tone} />
        </div>
        <p className="ticket-row-amount money">{money(job.amount_cents)}</p>
      </Link>
    </li>
  );
}

export default async function LindaPage() {
  const demo = await currentDemo();
  const jobs = listJobs(demo.id);
  const isNeeded = (j: Job) => NEEDS_YOU.has(j.status) || planFailed(j);
  const needsYou = jobs.filter(isNeeded);
  const others = jobs.filter((j) => !isNeeded(j));
  const live = jobs.filter((j) => !j.is_sample);
  const focus = live.find(isNeeded) ?? live[0];

  return (
    <>
      <TopBar role="linda" />
      <NextStepHint hint={nextStep("linda", focus, demo.auto_pay_limit_cents)} />
      <main className="page">
        <p className="eyebrow">Linda · 14 Alder Street</p>
        <h1>Repairs</h1>
        <LimitSetting limitCents={demo.auto_pay_limit_cents} />

        <section className="section">
          <h2>Needs you</h2>
          {needsYou.length ? (
            <ul className="ticket-list">
              {needsYou.map((job) => (
                <TicketRow key={job.id} job={job} />
              ))}
            </ul>
          ) : (
            <p className="empty">Nothing needs you right now.</p>
          )}
        </section>

        <section className="section">
          <h2>All jobs</h2>
          {others.length ? (
            <ul className="ticket-list">
              {others.map((job) => (
                <TicketRow key={job.id} job={job} />
              ))}
            </ul>
          ) : (
            <p className="empty">
              No other jobs yet. <Link href="/tenant">Report a problem as the tenant →</Link>
            </p>
          )}
        </section>
      </main>
    </>
  );
}
