// Checks the payment rules and the reused-photo fingerprint. No AI, no PayPal: run with `npm run check:rules`.

import { decide } from "../lib/rules";
import { fingerprint, distance } from "../lib/photos";
import sharp from "sharp";
const base = { previousFailures: 0, amountCents: 8500, limitCents: 10000, aiSucceeded: true };
const cases: [string, Parameters<typeof decide>[0], string][] = [
  ["all pass, $85 under limit", { ...base, verdicts: ["pass", "pass", "pass"] }, "pay"],
  ["all pass, exactly $100", { ...base, amountCents: 10000, verdicts: ["pass"] }, "pay"],
  ["all pass, $180 over limit", { ...base, amountCents: 18000, verdicts: ["pass", "pass"] }, "needs_linda"],
  ["one fail, first try", { ...base, verdicts: ["pass", "fail"] }, "needs_fix"],
  ["one fail, second try", { ...base, previousFailures: 1, verdicts: ["pass", "fail"] }, "needs_linda"],
  ["AI failed, all 'pass'", { ...base, aiSucceeded: false, verdicts: ["pass"] }, "needs_linda"],
  ["retake passes after a fix", { ...base, previousFailures: 1, verdicts: ["pass", "pass"] }, "pay"],
];
let bad = 0;
for (const [name, input, want] of cases) {
  const got = decide(input);
  const ok = got.action === want; if (!ok) bad++;
  console.log(`${ok ? "✔" : "✘"} ${name}: ${got.action} — ${got.reason}`);
}
(async () => {
  const img = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#777" } })
    .composite([{ input: Buffer.from('<svg width="640" height="480"><rect x="40" y="60" width="300" height="200" fill="#123"/><circle cx="480" cy="300" r="90" fill="#eee"/></svg>') }]).jpeg().toBuffer();
  const resaved = await sharp(img).resize(500).jpeg({ quality: 60 }).toBuffer();
  const other = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#777" } })
    .composite([{ input: Buffer.from('<svg width="640" height="480"><circle cx="150" cy="150" r="120" fill="#eee"/><rect x="380" y="250" width="200" height="180" fill="#123"/></svg>') }]).jpeg().toBuffer();
  const [a, b, c] = await Promise.all([fingerprint(img), fingerprint(resaved), fingerprint(other)]);
  console.log(`same photo resized+recompressed: distance ${distance(a, b)} (reused if ≤ 6)`);
  console.log(`different photo: distance ${distance(a, c)}`);
  process.exit(bad);
})();
