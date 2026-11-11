import Link from "next/link";
import type { Hint } from "@/lib/hints";

export function NextStepHint({ hint }: { hint: Hint }) {
  return (
    <aside className="hint-bar" aria-label="Next step">
      <span className="hint-label">Next</span>
      <p className="hint-text">{hint.text}</p>
      {hint.href && hint.cta && (
        <Link href={hint.href} className="hint-cta">
          {hint.cta}
        </Link>
      )}
    </aside>
  );
}
