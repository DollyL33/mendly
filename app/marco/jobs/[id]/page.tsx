import Link from "next/link";
import { NextStepHint } from "@/components/NextStepHint";
import { nextStep } from "@/lib/hints";

import { notFound } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { money } from "@/lib/format";
import { getChecklist, getJob } from "@/lib/jobs";
import { marcoStatus, MARCO_VISIBLE } from "@/lib/marco";
import { photoUrl } from "@/lib/photos";
import { latestPhotos } from "@/lib/proof";
import { ProofCapture } from "@/components/ProofCapture";
import { MarcoPayPalPanel } from "@/components/MarcoPayPalPanel";

export const dynamic = "force-dynamic";

export default async function MarcoJobPage({ params }: PageProps<"/marco/jobs/[id]">) {
  const { id } = await params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) notFound();

  if (!MARCO_VISIBLE.has(job.status)) {
    return (
      <>
        <TopBar role="marco" jobId={job.id} />
        <main className="page narrow marco">
          <Link href="/marco" className="back">
            ← Your jobs
          </Link>
          <p className="empty">This job isn't approved yet. Once Linda approves it in PayPal, it appears here.</p>
        </main>
      </>
    );
  }

  const checklist = getChecklist(job.id);
  const latest = latestPhotos(job.id);
  const s = marcoStatus[job.status];

  return (
    <>
      <TopBar role="marco" jobId={job.id} />
      <NextStepHint hint={job.is_sample ? { text: "This is a sample job showing a past repair. The live jobs are the ones without the Sample label." } : nextStep("marco", job, demo.auto_pay_limit_cents)} />
      <main className="page narrow marco">
        <Link href="/marco" className="back">
          ← Your jobs
        </Link>

        <section className="card marco-head">
          <p className="ticket-meta mono">
            Job #{job.number} · {job.address}
          </p>
          <h1 className="ticket-title">{job.title}</h1>
          <div className="marco-money">
            <p className="money big">{money(job.amount_cents)}</p>
            <StatusPill label={s.label} tone={s.tone} />
          </div>
          {job.status === "funded" && (
            <p className="muted small">Linda approved this in PayPal. The money is held, so it's there when the work is verified.</p>
          )}
        </section>

        <section className="card marco-section">
          <h2 className="section-label">The problem</h2>
          <div className="marco-problem">
            {job.report_photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="report-photo" src={photoUrl(job.report_photo)} alt="Tenant's photo of the problem" />
            )}
            <p>{job.summary}</p>
          </div>
        </section>

        <MarcoPayPalPanel
          jobId={job.id}
          status={job.status}
          amountLabel={money(job.amount_cents)}
          payoutStatus={job.payout_status}
          seconds={
            job.paid_at && job.proof_submitted_at
              ? Math.max(1, Math.round((Date.parse(job.paid_at) - Date.parse(job.proof_submitted_at)) / 1000))
              : null
          }
        />

        {job.status === "needs_fix" && (
          <p className="notice notice-attention">
            Some photos didn't pass. Retake only the items marked <strong>Problem</strong>; the verified ones are kept.
          </p>
        )}
        {job.status === "needs_linda" && (
          <p className="notice notice-attention">Linda is reviewing this job: {job.needs_linda_reason}</p>
        )}
        {job.status === "cancelled" && <p className="notice notice-problem">Linda cancelled this job. The hold was released.</p>}

        <h2 className="section-label marco-label">
          {job.status === "funded" ? "Proof photos to take when you're done" : "Proof photos"}
        </h2>
        <ProofCapture
          jobId={job.id}
          items={checklist.map((item) => {
            const last = latest[item.id];
            const canSubmit = job.status === "funded" || (job.status === "needs_fix" && last?.verdict !== "pass");
            return {
              id: item.id,
              label: item.label,
              instruction: item.photo_instruction,
              required: canSubmit && !job.is_sample,
              last: last
                ? { url: photoUrl(last.path), verdict: last.verdict, reason: last.reason, fix: last.fix_instruction }
                : undefined,
            };
          })}
        />
      </main>
    </>
  );
}
