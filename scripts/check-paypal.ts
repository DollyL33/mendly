// Day-one test of Mendly's whole money path in the PayPal sandbox.
//
//   npm run check:paypal            hold $85 from Linda, take it, pay Marco with Payouts
//   npm run check:paypal -- --payee fallback: make Marco the order's payee, so capture pays him
//
// You approve the payment as Linda in your browser while the script waits.

import {
  authorizeOrder,
  captureAuthorization,
  createAuthorizeOrder,
  createPayout,
  describePayPalError,
  getOrderStatus,
  getPayoutStatus,
} from "../lib/paypal";

const AMOUNT_CENTS = 8500;
const usePayeeFallback = process.argv.includes("--payee");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const step = (n: number, text: string) => console.log(`\n[${n}] ${text}`);
const ok = (text: string) => console.log(`    ✔ ${text}`);

async function main() {
  const missing = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "MARCO_PAYPAL_EMAIL"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing in .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }
  const marco = process.env.MARCO_PAYPAL_EMAIL!;
  const jobId = `check-${Date.now()}`;

  console.log(`Mendly money-path check (${usePayeeFallback ? "payee fallback" : "payouts"}), job ${jobId}`);

  step(1, "Create an order that HOLDS $85 (intent AUTHORIZE)");
  const order = await createAuthorizeOrder({
    amountCents: AMOUNT_CENTS,
    jobId,
    description: "Mendly check: replace kitchen faucet",
    returnUrl: "http://localhost:3000/",
    payeeEmail: usePayeeFallback ? marco : undefined,
  });
  ok(`Order ${order.orderId} (${order.status})`);

  step(2, "Linda approves in PayPal");
  console.log("    Open this link, log in with LINDA's sandbox account, and approve:");
  console.log(`\n    ${order.approveLink}\n`);
  console.log("    (Afterwards the page may say it can't connect. That's fine; come back here.)");
  const deadline = Date.now() + 20 * 60_000;
  let status: string | undefined = order.status;
  while (status !== "APPROVED") {
    if (Date.now() > deadline) throw new Error("Timed out after 20 minutes waiting for approval.");
    await sleep(3000);
    status = await getOrderStatus(order.orderId);
    process.stdout.write(`\r    waiting… order status: ${status}      `);
  }
  console.log("");
  ok("Linda approved");

  step(3, "Place the hold (authorize)");
  const auth = await authorizeOrder(order.orderId);
  ok(`Authorization ${auth.authorizationId} (${auth.status}), hold expires ${auth.expiresAt ?? "unknown"}`);

  step(4, "Take the held money (capture)");
  const capture = await captureAuthorization(auth.authorizationId, jobId);
  ok(`Capture ${capture.captureId} (${capture.status})`);

  if (usePayeeFallback) {
    console.log(`\nDone. With the payee fallback, the capture itself paid ${marco}.`);
    console.log("Check Marco's balance at https://www.sandbox.paypal.com");
    return;
  }

  step(5, `Pay Marco (${marco}) with Payouts`);
  const payout = await createPayout({
    senderBatchId: jobId,
    amountCents: AMOUNT_CENTS,
    receiverEmail: marco,
    note: "Kitchen faucet replaced and verified by Mendly.",
  });
  ok(`Payout batch ${payout.batchId} (${payout.batchStatus})`);

  step(6, "Ask PayPal for the payout status until it settles");
  const settleBy = Date.now() + 3 * 60_000;
  for (;;) {
    const s = await getPayoutStatus(payout.batchId);
    process.stdout.write(`\r    batch ${s.batchStatus}, payment to Marco ${s.itemStatus ?? "…"}      `);
    if (s.itemStatus === "SUCCESS") {
      console.log("");
      ok("Marco has been paid $85.00");
      break;
    }
    if (s.itemStatus && !["PENDING", "ONHOLD", "UNCLAIMED"].includes(s.itemStatus)) {
      console.log("");
      throw new Error(`Payment to Marco ended as ${s.itemStatus}${s.itemError ? `: ${s.itemError}` : ""}`);
    }
    if (Date.now() > settleBy) {
      console.log("");
      console.log(`    Still ${s.itemStatus ?? s.batchStatus} after 3 minutes. Mendly must show "Payment on its way" for this.`);
      break;
    }
    await sleep(5000);
  }

  console.log("\nMoney path works. Check Marco's balance at https://www.sandbox.paypal.com");
}

main().catch((err) => {
  console.error(`\n✘ ${describePayPalError(err)}`);
  if (!usePayeeFallback && /payout|AUTHORIZATION_ERROR|NOT_AUTHORIZED|403/i.test(String(describePayPalError(err)))) {
    console.error("If Payouts isn't enabled, try the fallback: npm run check:paypal -- --payee");
  }
  process.exit(1);
});
