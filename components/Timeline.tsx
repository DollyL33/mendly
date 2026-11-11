import type { JobEvent, JobStatus } from "@/lib/jobs";

const STEPS = [
  { key: "reported", label: "Reported" },
  { key: "funded", label: "Funded" },
  { key: "fixed", label: "Proof sent" },
  { key: "verified", label: "Verified" },
  { key: "paid", label: "Paid" },
] as const;

/** reported → funded → fixed → verified → paid, read from the job's own history. */
export function Timeline({ status, events }: { status: JobStatus; events: JobEvent[] }) {
  const has = (kind: string) => events.some((e) => e.kind === kind);
  const done: Record<(typeof STEPS)[number]["key"], boolean> = {
    reported: true,
    funded: has("funded"),
    fixed: has("proof_sent"),
    verified: has("auto_pay") || has("linda_paid") || status === "paid",
    paid: status === "paid",
  };
  const stopped = status === "cancelled" || status === "declined";

  return (
    <ol className="timeline" aria-label="Job progress">
      {STEPS.map((step) => (
        <li key={step.key} className={done[step.key] ? "done" : ""}>
          <span className="timeline-dot" aria-hidden />
          <span className="timeline-label">{step.label}</span>
        </li>
      ))}
      {stopped && (
        <li className="stopped">
          <span className="timeline-dot" aria-hidden />
          <span className="timeline-label">{status === "cancelled" ? "Cancelled" : "Declined"}</span>
        </li>
      )}
    </ol>
  );
}
