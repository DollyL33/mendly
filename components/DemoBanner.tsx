"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Copy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={`Copy ${label}`}
    >
      <span className="mono">{value}</span>
      <span className="copy-tag">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/** Sandbox login for Linda's PayPal, and Reset. Shown on every screen of the demo. */
export function DemoBanner({ email, password }: { email?: string; password?: string }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function reset() {
    if (!confirm("Reset the demo? Your jobs are cleared and the starting jobs come back.")) return;
    setResetting(true);
    await fetch("/api/demo/reset", { method: "POST" });
    setResetting(false);
    router.push("/tenant");
    router.refresh();
  }

  return (
    <div className="demo-banner">
      <div className="demo-banner-inner">
        <span className="demo-tag">Sandbox demo</span>
        {email && password ? (
          <span className="demo-login">
            Linda's PayPal sandbox login:
            <Copy value={email} label="email" />
            <Copy value={password} label="password" />
          </span>
        ) : (
          <span className="demo-login">PayPal sandbox: no real money moves.</span>
        )}
        <button type="button" className="demo-reset" onClick={reset} disabled={resetting}>
          {resetting ? "Resetting…" : "Reset demo"}
        </button>
      </div>
    </div>
  );
}
