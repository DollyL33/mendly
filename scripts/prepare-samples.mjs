// Turns the learner's original photos (public/samples/raw, never committed) into the demo's
// sample photos: rotated, shrunk to 1000px, brand labels blurred, all metadata (GPS) removed.
// Run: node scripts/prepare-samples.mjs

import sharp from "sharp";
import path from "node:path";

const RAW = "public/samples/raw";
const OUT = "public/samples";

// Regions (in the 750×1000 output) where product labels appear.
const LABELS = {
  "IMG_0728.jpeg": [{ left: 15, top: 260, width: 150, height: 320 }],
  "IMG_0730.jpeg": [{ left: 0, top: 70, width: 50, height: 340 }],
  "IMG_0733.jpeg": [
    { left: 0, top: 735, width: 395, height: 265 },
    { left: 515, top: 490, width: 235, height: 380 },
  ],
};

async function clean(file) {
  const base = await sharp(path.join(RAW, file)).rotate().resize(750, 1000, { fit: "cover" }).toBuffer();
  const patches = await Promise.all(
    (LABELS[file] ?? []).map(async (r) => ({
      input: await sharp(base).extract(r).blur(28).toBuffer(),
      left: r.left,
      top: r.top,
    })),
  );
  return sharp(base).composite(patches).toBuffer();
}

const save = (buf, name) => sharp(buf).jpeg({ quality: 82 }).toFile(path.join(OUT, name)); // no withMetadata(): EXIF/GPS dropped

const off = await clean("IMG_0728.jpeg");
const running = await clean("IMG_0730.jpeg");
const under = await clean("IMG_0733.jpeg");

await save(off, "pass-off.jpg");
await save(running, "pass-running.jpg");
await save(under, "pass-under-sink.jpg");
// Problem shot: the same under-sink view, badly out of focus.
await save(await sharp(under).blur(30).modulate({ brightness: 0.55 }).toBuffer(), "problem.jpg");
// Earlier-job photo: a closer crop of the sink, used as proof on the seeded "paid" sample job.
await save(await sharp(running).extract({ left: 0, top: 380, width: 750, height: 620 }).resize(750, 1000, { fit: "cover" }).toBuffer(), "seed-tap.jpg");
// Tenant report photo for the seeded faucet jobs.
await save(await sharp(off).extract({ left: 120, top: 0, width: 630, height: 840 }).toBuffer(), "seed-report.jpg");
console.log("sample photos written to", OUT);
