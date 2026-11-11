import Link from "next/link";
import { notFound } from "next/navigation";
import { ApproveAndFund } from "@/components/ApproveAndFund";
import { PlanEditor } from "@/components/PlanEditor";
import { RetryPlan } from "@/components/RetryPlan";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { lindaStatus, money, timeOf } from "@/lib/format";
import { getChecklist, getEvents, getJob } from "@/lib/jobs";
import { photoUrl } from "@/lib/photos";
import { proofPhotos } from "@/lib/proof";
import { InspectionStamp } from "@/components/InspectionStamp";

export const dynamic = "force-dynamic";

export default async function LindaJobPage({ params }: PageProps<"/linda/jobs/[id]">) {
  const { id } = await params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) notFound();

  const checklist = getChecklist(job.id);
  const events = getEvents(job.id);
  const proof = proofPhotos(job.id);
  const s = lindaStatus[job.status];
  const planFailed = job.status === "reported" && events.at(-1)?.kind === "plan_failed";
  const overLimit = job.amount_cents != null && job.amount_cents > demo.auto_pay_limit_cents;

  return (
    <>
      <TopBar role="linda" jobId={job.id} />
      <main className="page">
        <Link href="/linda" className="back">
          ← All repairs
        </Link>

        <article className="card ticket">
          <header className="ticket-head">
            <div>
              <p className="ticket-meta mono">
                Job #{job.number} · {job.address}
                {job.is_sample ? " · Sample" : ""}
              </p>
              <h1 className="ticket-title">{job.title}</h1>
              <StatusPill label={s.label} tone={s.tone} />
            </div>
            <div className="ticket-amount">
              <p className="money big">{money(job.amount_cents)}</p>
              {job.amount_cents != null && (
                <p className="muted small">
                  {overLimit
                    ? `Over your ${money(demo.auto_pay_limit_cents)} auto-pay limit, so you'll decide on payment`
                    : `Within your ${money(demo.auto_pay_limit_cents)} auto-pay limit`}
                </p>
              )}
            </div>
          </header>

          <section className="ticket-section report">
            {job.report_photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="report-photo" src={photoUrl(job.report_photo)} alt="Tenant's photo of the problem" />
            )}
            <div>
              <h2 className="section-label">Tenant's report</h2>
              <p className="quote">“{job.report_text}”</p>
            </div>
          </section>

          {job.status === "reported" ? (
            <section className="ticket-section">
              <h2 className="section-label">Agent's plan</h2>
              {planFailed ? (
                <>
                  <p className="notice notice-problem">{events.at(-1)!.message}</p>
                  <RetryPlan jobId={job.id} />
                </>
              ) : (
                <p className="muted">The agent is planning this job…</p>
              )}
            </section>
          ) : (
            <section className="ticket-section">
              <h2 className="section-label">Agent's plan</h2>
              <p className="summary">{job.summary}</p>
              {job.uncertain_notes && (
                <p className="notice notice-attention">
                  <strong>Couldn't tell for sure:</strong> {job.uncertain_notes}
                </p>
              )}
              <h3 className="section-label">Proof photos Marco must take</h3>
              <PlanEditor
                jobId={job.id}
                amountCents={job.amount_cents ?? 0}
                checklist={checklist.map((c) => ({ label: c.label, photoInstruction: c.photo_instruction }))}
                editable={job.status === "waiting_approval"}
              />
            </section>
          )}

          {job.status === "waiting_approval" && !job.is_sample && (
            <section className="ticket-section">
              <ApproveAndFund jobId={job.id} amountLabel={money(job.amount_cents)} />
            </section>
          )}

          {job.authorization_id && job.status === "funded" && (
            <section className="ticket-section money-status">
              <h2 className="section-label">Where your money is</h2>
              <p className="money-line">
                <span className="money">{money(job.amount_cents)}</span> held on your PayPal, not charged yet.
              </p>
              <p className="muted small">
                Marco can start. You're charged only when every proof photo is verified, or when you choose to pay.
              </p>
            </section>
          )}

          {job.status === "needs_linda" && (
            <section className="ticket-section">
              <p className="notice notice-attention">
                <strong>Needs your decision:</strong> {job.needs_linda_reason}
              </p>
            </section>
          )}

          {proof.length > 0 && (
            <section className="ticket-section">
              <h2 className="section-label">Proof photos and the agent's checks</h2>
              <ul className="proof-record">
                {proof.map((p) => {
                  const item = checklist.find((c) => c.id === p.item_id);
                  return (
                    <li key={p.id} className="result">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(p.path)} alt={`Proof for ${item?.label ?? "an item"}`} className="result-photo" />
                      <div className="result-body">
                        <p className="check-label">
                          {item?.label ?? "Removed item"}
                          {p.attempt > 1 && <span className="muted small"> · retake</span>}
                        </p>
                        <InspectionStamp verdict={p.verdict} />
                        <p className="result-reason">{p.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="ticket-section">
            <h2 className="section-label">History</h2>
            <ol className="history">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="mono history-time">{timeOf(e.at)}</span>
                  <span className={`history-actor actor-${e.actor}`}>{e.actor}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </main>
    </>
  );
}
