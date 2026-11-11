"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Marco's view of his money: "Payment on its way" until PayPal confirms, then "Paid". */
export function MarcoPayPalPanel({
  jobId,
  status,
  amountLabel,
  seconds,
  payoutStatus,
}: {
  jobId: string;
  status: string;
  amountLabel: string;
  seconds: number | null;
  payoutStatus: string | null;
}) {
  const router = useRouter();
  const [live, setLive] = useState({ status, payoutStatus });

  useEffect(() => setLive({ status, payoutStatus }), [status, payoutStatus]);

  useEffect(() => {
    if (live.status !== "paying") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}/payout-status`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setLive({ status: data.status, payoutStatus: data.payoutStatus });
      if (data.status !== "paying") router.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [jobId, live.status, router]);

  if (live.status === "paid") {
    return (
      <section className="card paypal-panel paid">
        <p className="paypal-panel-label">Your PayPal</p>
        <p className="paypal-panel-amount money">Paid {amountLabel}</p>
        <p className="paypal-panel-note">{seconds ? `${seconds} seconds after your proof was sent.` : "Payment received."}</p>
      </section>
    );
  }
  if (live.status === "paying") {
    return (
      <section className="card paypal-panel paying" aria-live="polite">
        <p className="paypal-panel-label">Your PayPal</p>
        <p className="paypal-panel-amount money">{amountLabel}</p>
        <p className="paypal-panel-note">
          <span className="pulse" aria-hidden /> Payment on its way
          {live.payoutStatus ? <span className="muted"> · PayPal: {live.payoutStatus.toLowerCase()}</span> : null}
        </p>
      </section>
    );
  }
  return null;
}
