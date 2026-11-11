---
doc: scope
status: approved
---

# Mendly

An AI repair agent for small landlords: it takes a tenant's repair report all the way to a verified, paid job, and only comes back to the owner when something needs a human.

## The Unique Kernel
The agent runs the whole repair, not just one step. The owner approves the money once, then the agent checks the proof and pays the handyman through PayPal, inside limits that code enforces. Automated, with a human in the loop only where it matters.

## Who It's For
**Linda** owns a rental in another city and manages it herself, without a property manager. Today she hears about a problem from her tenant, calls her handyman, and pays on trust because she can't go and look.

**Marco** is Linda's own independent handyman. Today he can wait a long time to get paid, and he doesn't know the money is there before he starts.

The tenant only needs a quick way to report a problem.

## The Core Loop
1. A tenant reports a problem with a photo.
2. The agent works out the job, the cost, and a photo checklist.
3. Linda reviews the plan and approves the money in PayPal, in one step.
4. Marco does the work and uploads his proof photos.
5. The agent checks each photo, and tells Marco exactly what to fix if one fails.
6. If everything passes and the job is under Linda's limit, Marco is paid automatically. If something looks off, a check fails twice, or the job is over the limit, Linda decides.

Linda comes back because repairs keep happening and each one takes her seconds, not days.

## Inspiration & Identity
Not discussed yet. `3-prd` covers look and feel. It needs to feel like a complete, trustworthy product, because Design is scored as a full product experience.

## Why This Matters to the Learner
They want to win: "I need everything quality work because I want to win." They're also curious about "learning, building and shipping things."

## What "Working" Looks Like
A judge sees one full repair run in the real app, with real PayPal sandbox payments:

- An $85 faucet repair goes through and Marco is paid with no input from Linda after her first approval.
- A $180 wall patch is over her $100 limit, so the agent stops and asks her.

**The "oh, that's cool" moment:** Marco uploads a reused photo and the agent rejects it. He takes a real one, it passes, and the payment arrives on screen while Linda's phone shows she never had to step in. The video closes on a single record of the job: the report, the approval, each photo check, and the payment.

## The POC Boundary
- A web app with tenant, owner, and handyman views, using demo logins
- One landlord, one property, one saved handyman
- Tenant report form with a photo
- AI job plan: problem, cost estimate, photo checklist
- Owner approval through PayPal, holding the money before work starts
- Live camera upload, with an AI check per photo and a reason for each result
- Reused-photo detection
- Fix-and-resend loop for Marco
- Auto-pay under the owner's limit (default $100), enforced in code
- Owner decision screen: pay or cancel the job
- Job record showing every step
- Hosted demo that stays up through Dec 15, 2026, and a public repo with an open source license

## Later
- GPS and time checks
- Before-and-after photo matching
- Random challenge shots
- 80/20 payment holdback
- Trust that builds with a clean record
- Refunds and disputes after payment
- Emergency handling
- Note-in-the-photo trick demo, if time allows

## Explicitly Cut
- **Finding new handymen:** a marketplace is a different product, and the agent only uses the owner's trusted handyman.
- **Native mobile apps:** a web app works on a phone, and there's no time to build more.
- **Real SMS or email:** in-app updates prove the same flow.
- **Multiple properties and owners:** they add work without proving anything new.
- **Real money:** the hackathon uses the PayPal sandbox.
- **Claims of being first or fraud-proof:** we can't support them. We say "harder to fake."
