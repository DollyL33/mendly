import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { money } from "@/lib/format";
import { getChecklist, getJob } from "@/lib/jobs";
import { marcoStatus, MARCO_VISIBLE } from "@/lib/marco";
import { photoUrl } from "@/lib/photos";

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
  const s = marcoStatus[job.status];

  return (
    <>
      <TopBar role="marco" jobId={job.id} />
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

        <section className="card marco-section">
          <h2 className="section-label">Proof photos to take when you're done</h2>
          <ol className="checklist">
            {checklist.map((item, i) => (
              <li key={item.id}>
                <span className="check-num mono">{i + 1}</span>
                <div>
                  <p className="check-label">{item.label}</p>
                  <p className="check-instruction">{item.photo_instruction}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="muted small">Taking and sending proof photos arrives in the next step of the build.</p>
        </section>
      </main>
    </>
  );
}
