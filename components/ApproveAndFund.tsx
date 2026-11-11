"use client";

import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The real PayPal button. Approving places a hold on Linda's PayPal; nothing is charged yet. */
export function ApproveAndFund({ jobId, amountLabel }: { jobId: string; amountLabel: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "attention" | "problem"; text: string } | null>(null);
  const [busy, setBusy] = useState<null | "holding" | "declining">(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  async function decline() {
    if (!confirm("Decline this job? Nothing will be held or charged.")) return;
    setBusy("declining");
    await fetch(`/api/jobs/${jobId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="approve">
      <div className="approve-copy">
        <h2 className="approve-title">Approve and fund {amountLabel}</h2>
        <p className="muted">
          PayPal holds the money on your account. You're only charged when the work is verified, or when you choose
          to pay.
        </p>
      </div>

      <div className="approve-actions">
        {!clientId ? (
          <p className="notice notice-problem">PayPal isn't configured: NEXT_PUBLIC_PAYPAL_CLIENT_ID is missing.</p>
        ) : busy === "holding" ? (
          <p className="notice notice-attention">Placing the hold with PayPal…</p>
        ) : (
          <PayPalProvider clientId={clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
            <PayPalOneTimePaymentButton
              presentationMode="auto"
              createOrder={async () => {
                setMessage(null);
                const res = await fetch(`/api/jobs/${jobId}/paypal/order`, { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "PayPal couldn't start the payment.");
                return { orderId: data.orderId };
              }}
              onApprove={async ({ orderId }) => {
                setBusy("holding");
                const res = await fetch(`/api/jobs/${jobId}/paypal/approve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId }),
                });
                const data = await res.json().catch(() => ({}));
                setBusy(null);
                if (!res.ok) setMessage({ tone: "problem", text: data.error ?? "PayPal couldn't place the hold." });
                router.refresh();
              }}
              onCancel={() =>
                setMessage({
                  tone: "attention",
                  text: "You closed PayPal without approving. The job is still waiting for your approval.",
                })
              }
              onError={() =>
                setMessage({ tone: "problem", text: "PayPal had a problem. Nothing was held. Try again." })
              }
            />
          </PayPalProvider>
        )}
        <button type="button" className="button-quiet decline" onClick={decline} disabled={busy !== null}>
          {busy === "declining" ? "Declining…" : "Decline job"}
        </button>
      </div>

      {message && <p className={`notice notice-${message.tone}`}>{message.text}</p>}
    </div>
  );
}
