// The guided demo: what happens next, and a button to switch to whoever acts next.

import type { Role } from "@/components/TopBar";
import type { Job } from "./jobs";

export interface Hint {
  text: string;
  href?: string;
  cta?: string;
}

const lindaJob = (j: Job) => `/linda/jobs/${j.id}`;
const marcoJob = (j: Job) => `/marco/jobs/${j.id}`;

/** The hint for a page. `job` is the job on screen, or the newest live job for list pages. */
export function nextStep(role: Role, job: Job | undefined, limitCents: number): Hint {
  if (!job) {
    if (role === "tenant") return { text: "Start here: report a problem with a photo. The agent turns it into a job for Linda." };
    return { text: "Nothing live yet. The repair starts with the tenant's report.", href: "/tenant", cta: "Continue as the tenant →" };
  }
  const overLimit = (job.amount_cents ?? 0) > limitCents;

  switch (job.status) {
    case "reported":
      return role === "linda"
        ? { text: "The agent couldn't plan this yet. Try planning again." }
        : { text: "The agent is planning this job for Linda.", href: lindaJob(job), cta: "Continue as Linda →" };
    case "waiting_approval":
      return role === "linda"
        ? {
            text: overLimit
              ? `This job is over your auto-pay limit, so you'll decide on payment at the end. To see auto-pay, set the amount at or under your limit.`
              : `Approve with the PayPal button using the sandbox login above. The money is held, not charged.`,
          }
        : { text: "Now it's Linda's turn: she reviews the agent's plan and approves it in PayPal.", href: lindaJob(job), cta: "Continue as Linda →" };
    case "funded":
      return role === "marco"
        ? { text: "The money is held. Take a photo for each item, or use a sample set, then send." }
        : { text: "The money is held. Now it's Marco's turn to do the job and send proof.", href: marcoJob(job), cta: "Continue as Marco →" };
    case "inspecting":
      return { text: "The agent is checking Marco's photos." };
    case "needs_fix":
      return role === "marco"
        ? { text: "Retake only the items marked Problem, then send again." }
        : { text: "Some photos didn't pass. Marco retakes only those.", href: marcoJob(job), cta: "Continue as Marco →" };
    case "needs_linda":
      return role === "linda"
        ? { text: "This one needs you. Pay Marco, or cancel and release the hold." }
        : { text: "This job needs Linda's decision.", href: lindaJob(job), cta: "Continue as Linda →" };
    case "paying":
      return role === "marco"
        ? { text: "Payment is on its way. This page updates when PayPal confirms." }
        : { text: "Paying Marco now. Watch it land on his side.", href: marcoJob(job), cta: "Continue as Marco →" };
    case "paid":
      return role === "linda"
        ? { text: "Done. The full record of this repair is below.", href: "/tenant", cta: "See the tenant's view →" }
        : role === "tenant"
          ? { text: "Fixed and verified. Linda's ticket has the full record.", href: lindaJob(job), cta: "Continue as Linda →" }
          : { text: "Paid. Linda's ticket has the full record of this repair.", href: lindaJob(job), cta: "Continue as Linda →" };
    case "cancelled":
      return { text: "Cancelled. The hold was released and nobody was charged." };
    case "declined":
      return { text: "Declined. Nothing was held." };
  }
}
