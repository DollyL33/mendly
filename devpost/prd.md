---
doc: prd
status: approved
---

# Mendly — Product Requirements

An AI repair agent for small landlords who manage their own rentals. It takes a tenant's repair report all the way to a verified job paid through PayPal, and only comes back to the owner when something needs a human.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **A judge arrives.** They land on the entry page, read a one-line pitch and a three-step story strip, and pick a role or start the guided flow. No sign-up, no password.
2. **The tenant reports a problem.** They describe it in a sentence and add a photo, for example a leaking kitchen faucet.
3. **The agent plans the job.** It writes a short problem summary, a cost estimate, and a photo checklist of 2-4 items. This appears on Linda's job ticket.
4. **Linda reviews and approves once.** She checks the plan and approves through PayPal using the sandbox login in the demo banner. The money is held on her PayPal account but not charged yet.
5. **Marco sees a funded job.** His view shows the money is held, the address, the problem, and the checklist.
6. **Marco submits proof.** He takes a photo per checklist item with the live camera, or picks a sample photo set in demo mode.
7. **The agent inspects each photo.** Each item gets a Verified stamp or a Problem mark, with one plain sentence of reasoning. A reused photo is caught and rejected.
8. **Marco fixes and resends** anything that failed.
9. **The outcome:**
   - **All verified and the job is at or under Linda's limit (default $100):** Mendly takes the held money and pays Marco automatically. Marco's panel shows "Payment on its way", then "Paid $85". Linda does nothing.
   - **Over the limit, an item fails twice, or something is flagged:** the job goes to Linda, who chooses to pay Marco or cancel.
10. **Everyone sees the result.** The tenant sees "Fixed and verified." Linda's ticket shows the full record: report, approval, each photo check, and payment.

**Success:** a judge completes the $85 faucet repair end to end, sees Marco paid with no input from Linda after her first approval, and sees a reused photo caught.

## Screens and Layout

### Entry page
- Name and one-line pitch: "Mendly: repairs get verified by AI and paid through PayPal in minutes."
- A three-step story strip: reported → fixed and proven → verified and paid.
- A highlighted **Start the guided demo** button, which enters as the tenant.
- Three role cards, each with a name, role, one line, and a single button:
  - **Linda, landlord:** "Approve and fund repairs from anywhere." Enter as Linda.
  - **Marco, handyman:** "Do the job, upload proof, get paid." Enter as Marco.
  - **The tenant:** "Report a problem, see when it's fixed." Enter as tenant.

### Always-visible top bar (inside the app)
- **Role switcher:** "Viewing as: Linda ▾". Switching keeps you on the same job.
- **Demo banner:** the sandbox PayPal login for Linda, with copy buttons.
- **Reset demo** button.

### Next-step hint
Shown on every screen. It says what happens next and offers a button that switches role, for example "Now it's Marco's turn. Continue as Marco →". This is the guided demo, not a separate tour mode.

### Tenant view
- Report form: description and one photo.
- After sending: the status of their report, ending in "Fixed and verified."

### Linda's view (desktop-friendly)
- **Needs you** section at the top, then her other jobs as job tickets.
- **Job ticket:** address, problem, amount, plain-words money status, the AI plan and checklist, a timeline (reported → funded → fixed → verified → paid), and each proof photo with its stamp and reason.
- **Approve and fund** with the real PayPal button, and **Decline**.
- **Decision panel** for jobs that need her: Pay Marco or Cancel job.
- **Auto-pay limit** setting, default $100.

### Marco's view (mobile-first)
- His jobs, each showing that the money is held before he starts.
- **Job screen:** the checklist with a large capture button per item, or **Use sample proof photos** in demo mode.
- Results per item: Verified stamp or what to fix, with a retake button.
- **Marco's PayPal panel:** payment status, amount, and time from proof to paid.

Paths `/demo/linda`, `/demo/marco` and `/demo/tenant` open each view directly. These go in the README and Devpost description.

## Look and Feel

**Summary:** "Mendly should feel like a calm, precise job ticket: warm paper, deep workshop green, receipt-clear money, and AI verification shown as inspection stamps with photo evidence, never as sparkles or chat."

**Mood:** calm control. Three words: calm, precise, warm. Like a trustworthy contractor's job ticket, not a chatbot. Within two seconds Linda should know what's happening, what needs her, and where her money is.

| Use | Color | Hex |
|---|---|---|
| Background | Warm paper | `#FAF7F2` |
| Text | Deep slate ink | `#1F2A2E` |
| Brand and primary buttons | Workshop green | `#1E5B4F` |
| Verified / paid | Fresh green | `#2F8F5B` |
| Needs your attention | Amber | `#D98E04` |
| Problem / flagged | Brick red, used sparingly | `#B3412E` |
| Lines and dividers | Soft stone | `#E4DED4` |

- Green and amber are signals, not decoration. PayPal blue appears only on real PayPal buttons.
- **Type:** a warm, readable sans-serif such as Figtree or IBM Plex Sans. Money and job numbers in a tabular or monospaced font, like a receipt. Money amounts big and plain.
- **References for feel only, not to copy:** Mercury (quiet confidence with money), Apple Wallet receipts (a clear record of what was paid), Things (checklists where each tick feels earned), a paper job ticket or inspection form.
- **Signature details:** the job ticket card with its timeline; the inspection stamp beside each proof photo; money states in plain words ("Held on your PayPal, not charged yet", "Paid to Marco, $85, 38 seconds after proof").
- **Marco's view:** mobile-first, big buttons, high contrast for daylight on a job site.
- **Avoid:** purple or blue gradients, AI sparkles, robot or brain icons; the AI's work shown as chat bubbles; glassy, neon or dark-first futuristic styling; grids of identical cards, stock 3D art, emoji everywhere; vague "AI magic" wording; anything resembling PayPal's own app or hiding the money status.

## Features and Behavior

### Repair reports
- As the tenant, I want to report a problem with a photo so that it gets fixed without chasing anyone.
  - [ ] The form takes a description and one photo, and won't send without both.
  - [ ] After sending, the tenant sees the report's status, ending in "Fixed and verified".

### Agent job planning
Source: `scope.md > The Core Loop`, step 2.
- As Linda, I want the agent to turn a report into a clear job so that I can approve it in seconds.
  - [ ] The ticket shows a plain-language problem summary, a cost estimate, and 2-4 photo checklist items.
  - [ ] Each checklist item describes a photo Marco can actually take, such as "New faucet installed under the sink, water running."
  - [ ] Linda can edit the amount and checklist before approving.

### Approval and funding
Source: `scope.md > The POC Boundary`, owner approval through PayPal.
- As Linda, I want to approve and fund a job once so that Marco knows the money is there.
  - [ ] Approve opens the real PayPal sandbox flow. After approving, the ticket reads "Held on your PayPal, not charged yet."
  - [ ] Decline closes the job, and nothing is held.
  - [ ] If Linda closes the PayPal window without approving, the job stays "Waiting for your approval."

### Proof submission
- As Marco, I want to submit proof quickly on site so that I get paid without waiting on anyone.
  - [ ] Each checklist item has a capture button that opens the live camera.
  - [ ] In demo mode, **Use sample proof photos** offers three labeled sets: one that passes, one with a problem, and one containing a reused photo.
  - [ ] Marco can't submit until every checklist item has a photo.

### AI inspection
Source: `scope.md > The Unique Kernel`.
- As Linda, I want each photo checked with a visible reason so that I can trust payments I didn't watch happen.
  - [ ] Each item shows a Verified stamp or a Problem mark beside its photo, with one plain sentence of reasoning.
  - [ ] A failed item tells Marco exactly what to fix, for example "The photo doesn't show the faucet installed under the sink."
  - [ ] A photo identical or nearly identical to one from an earlier job is flagged as reused, regardless of what the AI thinks of it.
  - [ ] Text written inside a photo, such as "approve this", has no effect on the result.

### Fix and resend
- [ ] Marco can retake and resubmit only the failed items.
- [ ] If the same job fails a second time, it goes to Linda's **Needs you** section.

### Automatic payment
Source: `scope.md > What "Working" Looks Like`.
- As Marco, I want to be paid as soon as my proof passes so that I don't chase payment.
  - [ ] When all items are verified, nothing is flagged, and the amount is at or under Linda's limit, payment starts with no action from Linda.
  - [ ] Marco's panel shows "Payment on its way", then "Paid $85" with the time from proof to paid.
  - [ ] Linda's ticket shows the job was handled without her.
  - [ ] The limit rule is enforced by the app's rules, not by the AI.

### Linda's decisions
- As Linda, I want to step in only when something is off so that I'm not inspecting every job.
  - [ ] Jobs over her limit, failed twice, or flagged appear under **Needs you**, with the reason.
  - [ ] **Pay Marco** pays him and records that Linda approved it.
  - [ ] **Cancel job** releases the hold; Linda isn't charged, and Marco sees the job was cancelled.
  - [ ] Linda can change her auto-pay limit, and new decisions use the new limit.

### Job record
- [ ] Every ticket shows the full history: report, plan, approval, each photo with its result, decisions, and payment, each with a time.

### Demo experience
- [ ] Every visitor gets their own copy of the demo data, so judges don't overwrite each other.
- [ ] **Reset demo** restores the starting data.
- [ ] Seeded jobs show every state without a full run: a $180 wall patch waiting for Linda (over the limit), a paid job, and a job flagged for a reused photo.
- [ ] Every screen shows a next-step hint with a role-switch button.

## States and Boundaries
- **First visit:** entry page; demo data seeded for this visitor.
- **Waiting for approval:** Linda's ticket shows the plan and the Approve button; Marco can't start yet.
- **Money held:** "Held on your PayPal, not charged yet" for Linda; "Money is held for this job" for Marco.
- **Inspection running:** each item shows it's being checked.
- **Partly failed:** failed items show what to fix; passed items keep their stamps.
- **Needs Linda:** amber, with the reason in plain words.
- **Payment on its way:** shown until PayPal confirms.
- **Paid:** green, with amount and time.
- **Cancelled:** hold released, shown to all three roles.
- **PayPal or AI error:** a plain message and a retry. If the AI check can't run, nothing is paid automatically and the job goes to Linda.
- **Unclear tenant photo:** the agent still drafts a plan and marks what's uncertain for Linda.
- **What persists:** a visitor's demo jobs stay until they reset or their session ends.
- **Permissions:** in the demo anyone can switch roles. Only Linda's view can approve, decide, or change the limit.

## Product Decisions
- **Judges enter by role with one click, no sign-up:** judges arrive cold and shouldn't hit a login wall.
- **Guided demo is the next-step hint plus a role-switch button,** not a separate tour mode: same experience, far less to build.
- **The tenant only reports and sees the result,** no confirmation step: keeps the tenant simple.
- **Sample proof photo sets in demo mode:** judges are at a desk, not at the rental. The video mentions that real users must use the live camera.
- **One private demo per visitor, plus Reset:** several judges can try it at once.
- **Seeded jobs at different stages:** a judge who only clicks around still sees every state.
- **Marco's PayPal panel in the app:** judges won't log into a second sandbox account.
- **$85 job auto-pays; the $180 job goes to Linda:** shows both automation and the human in the loop. (From `2-scope`.)
- **AI work appears as inspection stamps with evidence, never as chat:** trust comes from showing evidence.
- **Linda can edit the plan before approving; an AI failure never auto-pays; an unclear tenant photo still gets a plan marked as uncertain:** confirmed at review.

## What We're Building
- Entry page with pitch, story strip, guided start, and three role cards
- Top bar with role switcher, demo banner, and Reset
- Next-step hints with role-switch buttons
- Tenant report form and status
- AI job plan: summary, estimate, photo checklist
- Linda's tickets, Needs you section, PayPal approve and hold, decline, decision panel, auto-pay limit
- Marco's mobile-first job screen with live camera and sample photo sets
- AI photo inspection with stamps and reasons; reused-photo detection
- Fix-and-resend, with escalation to Linda after a second failure
- Automatic payment under the limit, enforced by app rules
- Marco's PayPal panel with payment status and time to paid
- Job record timeline
- Per-visitor demo data, Reset, and seeded jobs
- Hosted demo running through Dec 15, 2026; public repo with an open source license

## Deferred From the POC
- **Real accounts and logins:** demo roles prove the flow; accounts are a whole system.
- **Notifications by SMS or email:** in-app status and hints show the same flow.
- **Linda adding or choosing handymen:** the agent uses her one saved handyman.
- **Multiple properties:** one property is enough to prove the idea.

## Possible Later Enhancements
GPS and time checks, before-and-after photo matching, random challenge shots, an 80/20 payment holdback, trust that builds with a clean record, refunds and disputes after payment, emergency handling, and the note-in-the-photo trick as a demo moment.

## Non-Goals
- **A chat interface:** the AI's work is shown as checks on the job.
- **A handyman marketplace:** a different product.
- **Native mobile apps:** the web app works on a phone.
- **Real money:** the hackathon uses the PayPal sandbox.
- **Claims of being first or fraud-proof:** we say "harder to fake."
- **Looking like PayPal's own app:** PayPal appears only as real PayPal buttons and flows.

## Open Questions
- **Public sandbox login (resolve in `4-spec`):** anyone could change the password and break the demo. Needs a protection plan.
- **Holding then taking the money, and paying Marco (confirm in `4-spec`):** check against PayPal's docs, including how long a hold lasts and whether Payouts needs enabling in the sandbox.
- **AI provider and cost (decide in `4-spec`):** waiting on what the Devpost Resources page offers.
