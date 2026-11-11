// Runs the job planner for a job and saves the result. Used by new reports and by "Try again".

import { planJob } from "./ai";
import { useAiCall } from "./demo";
import { addEvent, replaceChecklist, setStatus, type Job } from "./jobs";

export type PlanOutcome = { ok: true } | { ok: false; message: string };

export async function runPlanning(job: Job): Promise<PlanOutcome> {
  if (!useAiCall(job.demo_id)) {
    const message = "Demo limit reached, press Reset or try later.";
    addEvent(job.id, "agent", "plan_failed", message);
    return { ok: false, message };
  }
  try {
    const plan = await planJob(job.report_text, job.report_photo);
    replaceChecklist(job.id, plan.checklist);
    setStatus(
      job.id,
      "waiting_approval",
      {
        actor: "agent",
        kind: "planned",
        message: `Agent planned the job: ${plan.checklist.length} proof photos, estimate $${plan.estimateUsd}.`,
      },
      {
        title: plan.title,
        summary: plan.summary,
        uncertain_notes: plan.uncertainNotes.trim() || null,
        amount_cents: plan.estimateUsd * 100,
      },
    );
    return { ok: true };
  } catch (err) {
    console.error("planJob failed", err);
    const message = "Couldn't plan this job right now. Try again in a moment.";
    addEvent(job.id, "agent", "plan_failed", message);
    return { ok: false, message };
  }
}
