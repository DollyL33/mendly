import type { Tone } from "@/lib/format";

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`pill pill-${tone}`}>{label}</span>;
}
