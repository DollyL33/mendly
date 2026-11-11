import { ReportForm } from "@/components/ReportForm";
import { StatusPill } from "@/components/StatusPill";
import { TopBar } from "@/components/TopBar";
import { currentDemo } from "@/lib/demo";
import { tenantStatus, timeOf } from "@/lib/format";
import { listJobs, PROPERTY_ADDRESS } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function TenantPage() {
  const demo = await currentDemo();
  const reports = listJobs(demo.id).filter((j) => !j.is_sample);

  return (
    <>
      <TopBar role="tenant" />
      <main className="page narrow">
        <p className="eyebrow">{PROPERTY_ADDRESS}</p>
        <h1>Report a problem</h1>
        <p className="lede">Tell Linda what's wrong and add a photo. You'll see here when it's fixed.</p>

        <ReportForm />

        {reports.length > 0 && (
          <section className="section">
            <h2>Your reports</h2>
            <ul className="report-list">
              {reports.map((job) => {
                const s = tenantStatus[job.status];
                return (
                  <li key={job.id} className="card report-row">
                    <div>
                      <p className="report-title">{job.title}</p>
                      <p className="muted small">Sent {timeOf(job.created_at)}</p>
                    </div>
                    <StatusPill label={s.label} tone={s.tone} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
