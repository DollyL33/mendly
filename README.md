# Mendly

**Repairs get verified by AI and paid through PayPal in minutes.**

Mendly is an AI repair agent for small landlords who manage their own rentals. A tenant reports a problem with a photo. The agent plans the job, the landlord approves once in PayPal (the money is held, not charged), the handyman sends proof photos, and the agent checks each one. If everything is verified and the job is within the landlord's limit, Mendly pays the handyman automatically. Otherwise it asks the landlord.

**Live demo: https://mendly-hed3.onrender.com** · Open a role directly: [tenant](https://mendly-hed3.onrender.com/demo/tenant) · [Linda](https://mendly-hed3.onrender.com/demo/linda) · [Marco](https://mendly-hed3.onrender.com/demo/marco)

License: [MIT](LICENSE)

## Try it (about 3 minutes)

1. Open the demo and click **Start the guided demo**. You get your own private copy of the data.
2. **Tenant:** click **Use an example report**, then **Send report**. The agent writes a plan in a few seconds.
3. **Linda (landlord):** follow the green **Next** bar. Set the amount at or under $100 and keep the "tap off" and "tap running" photos. Click the PayPal button and log in with the **sandbox login shown in the dark banner** (use its Copy buttons). The ticket now reads *"Held on your PayPal, not charged yet."*
4. **Marco (handyman):** click **Set A: passes**, then **Send**. Each photo gets a Verified stamp with a reason, then *"Payment on its way"* turns into *"Paid"* with the seconds from proof to payment.
5. Try the other paths:
   - **Set C** includes a photo from an earlier job: the reuse check catches it.
   - **Set B** includes a blurry photo: the agent says exactly what to retake. A second failure goes to Linda.
   - The **$180 wall patch** is over the $100 limit, so Linda decides at the end: **Pay Marco** or **Cancel job** (the hold is released).
6. **Reset demo** (top right) starts over. Each sample set can be used once per demo; reusing it on another job is caught as reuse, as it should be.

The PayPal **sandbox** is used throughout: no real money moves. On a real job Marco uses the live camera; the sample photo sets exist because judges aren't at the rental.

## How it works

```
Tenant report + photo
   │
   ▼
Claude (planner) ─► summary, estimate, 2–4 proof photos          [lib/ai.ts → planJob]
   │
   ▼
Linda approves in PayPal ─► Orders v2, intent AUTHORIZE: money held  [lib/paypal.ts]
   │
   ▼
Marco sends proof photos
   ├─► code: fingerprint each photo, catch reused ones               [lib/photos.ts]
   └─► Claude (inspector): verdict + reason per photo                [lib/ai.ts → inspectProof]
   │
   ▼
Payment rules (plain code, no AI)                                    [lib/rules.ts]
   ├─ any fail, first time ─► Marco retakes only those items
   ├─ fail twice / over limit / AI unavailable ─► Linda: Pay or Cancel (void the hold)
   └─ all verified and within limit ─► capture the hold ─► Payouts to Marco ─► "Paid"
```

**The core rule:** Claude only writes plans and verdicts. Code decides whether money moves. Reused photos are caught by code, so no wording in a photo can talk its way past them, and text inside a photo ("approve this") is treated as evidence, never as an instruction.

## PayPal integration

| Step | API | Where |
|---|---|---|
| Hold Linda's money | Orders v2 `createOrder` (intent `AUTHORIZE`) + `authorizeOrder` | `lib/paypal.ts`, PayPal Server SDK |
| Approve in PayPal | PayPal JS SDK v6 button (`@paypal/react-paypal-js/sdk-v6`) | `components/ApproveAndFund.tsx` |
| Take the held money | Payments v2 `captureAuthorizedPayment` (with a request ID, so a retry never double-captures) | `lib/payment.ts` |
| Release the hold | Payments v2 `voidPayment` | `app/api/jobs/[id]/decision` |
| Pay Marco | Payouts v1 `POST /v1/payments/payouts`, the job ID as `sender_batch_id` so a job can't be paid twice | `lib/paypal.ts` (REST: the Server SDK has no Payouts) |
| Confirm payment | Payouts v1 `GET /v1/payments/payouts/{id}`, polled while Marco's panel is open | `lib/payment.ts` |

`npm run check:paypal` runs the whole money path from the command line: hold $85, approve as Linda, capture, pay Marco, and wait for `SUCCESS`.

## AI tools used

- **Claude Opus 5.5 (`claude-opus-5-5`) via the Anthropic API, inside the app.** Two calls per job, both with structured outputs (a JSON schema the answer must fit):
  - **Planner:** reads the tenant's photo and words; returns a summary, a cost estimate, 2–4 proof-photo instructions, and what it couldn't tell from the photo.
  - **Inspector:** reads every proof photo against its checklist item; returns pass or fail, a one-sentence reason, and a fix instruction.
- **Claude Code (Claude Opus 5.5) to build it.** The app was planned and written with Claude Code, from a written scope, product requirements and technical spec (in `devpost/`). PayPal SDK calls were checked against the SDK's own type definitions.
- **Not AI, on purpose:** reused-photo detection (a 64-bit difference hash in `lib/photos.ts`) and the payment rules (`lib/rules.ts`). `npm run check:rules` tests both without AI or PayPal.

## Run it yourself

Requirements: Node.js 22, a PayPal developer account (sandbox), and an Anthropic API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # open http://localhost:3000
```

In the PayPal developer dashboard (Sandbox): create an app for its client ID and secret, and use two **Personal** sandbox accounts, one as Linda (pays) and one as Marco (receives payouts).

| Variable | What it is |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox app credentials (secret stays on the server) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same client ID, used by the PayPal button |
| `PAYPAL_API_BASE` | `https://api-m.sandbox.paypal.com` |
| `MARCO_PAYPAL_EMAIL` | Marco's sandbox account (receives payouts) |
| `DEMO_LINDA_EMAIL`, `DEMO_LINDA_PASSWORD` | Linda's **sandbox** login, shown in the demo banner |
| `ANTHROPIC_API_KEY` | From the Anthropic Console |
| `AI_CALLS_PER_VISITOR` | Claude calls allowed per demo visitor (default 20) |
| `DATA_DIR` | Where the SQLite database and photos live (`./data` locally) |

Checks: `npm run check:rules` (rules and fingerprints), `npm run check:paypal` (sandbox money path).

## Stack

Next.js 16 (App Router) and TypeScript · SQLite (`better-sqlite3`) · `sharp` for resizing, metadata stripping and fingerprints · Anthropic TypeScript SDK · PayPal Server SDK and JS SDK v6 · hosted on Render with a persistent disk.

## Notes

- Sample photos are the author's own, with product labels blurred and all metadata (including location) removed by `scripts/prepare-samples.mjs`.
- Mendly makes repair proof **harder to fake**, not impossible: a determined person can still stage a photo. Linda's limit and the rules bound what can be paid automatically.
- Planning documents (scope, product requirements, technical spec, build checklist) are in [`devpost/`](devpost/).
