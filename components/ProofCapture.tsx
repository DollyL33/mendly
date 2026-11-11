"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { assignSamples, SAMPLE_SETS, type SampleSet } from "@/lib/samples";
import { CameraCapture } from "./CameraCapture";
import { InspectionStamp } from "./InspectionStamp";

export interface ProofItem {
  id: string;
  label: string;
  instruction: string;
  /** Needs a (new) photo in this submission. */
  required: boolean;
  last?: { url: string; verdict: "pass" | "fail" | null; reason: string | null; fix: string | null };
}

type Pick = { kind: "file"; file: File; preview: string } | { kind: "sample"; file: string; caption: string };

export function ProofCapture({ jobId, items }: { jobId: string; items: ProofItem[] }) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [cameraFor, setCameraFor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = items.filter((i) => i.required);
  const ready = required.every((i) => picks[i.id]);

  useEffect(
    () => () => Object.values(picks).forEach((p) => p.kind === "file" && URL.revokeObjectURL(p.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function setPick(itemId: string, pick: Pick) {
    setPicks((prev) => {
      const old = prev[itemId];
      if (old?.kind === "file") URL.revokeObjectURL(old.preview);
      return { ...prev, [itemId]: pick };
    });
  }

  function useSampleSet(set: SampleSet) {
    const chosen = assignSamples(
      required.map((i) => ({ id: i.id, text: `${i.label} ${i.instruction}` })),
      set,
    );
    for (const [itemId, photo] of Object.entries(chosen)) {
      setPick(itemId, { kind: "sample", file: photo.file, caption: photo.caption });
    }
  }

  async function submit() {
    if (!ready) return;
    setSending(true);
    setError(null);
    const body = new FormData();
    for (const item of required) {
      const pick = picks[item.id];
      if (pick.kind === "file") body.set(`photo:${item.id}`, pick.file);
      else body.set(`sample:${item.id}`, pick.file);
    }
    try {
      const res = await fetch(`/api/jobs/${jobId}/proof`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send the photos. Try again.");
      setPicks({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the photos. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="proof">
      <div className="card samples">
        <p className="samples-title">Demo mode: use sample proof photos</p>
        <p className="muted small">
          Judges aren't at the rental. On a real job, Marco uses the live camera, and every photo is checked against
          earlier jobs. Set C includes a photo from an earlier job, to show that check catching it.
        </p>
        <div className="sample-buttons">
          {(Object.keys(SAMPLE_SETS) as SampleSet[]).map((set) => (
            <button key={set} type="button" className="sample-button" onClick={() => useSampleSet(set)} disabled={sending}>
              {SAMPLE_SETS[set]}
            </button>
          ))}
        </div>
      </div>

      <ol className="proof-items">
        {items.map((item, i) => {
          const pick = picks[item.id];
          const previewUrl = pick ? (pick.kind === "file" ? pick.preview : `/samples/${pick.file}`) : null;
          return (
            <li key={item.id} className={`card proof-item ${item.required ? "" : "done"}`}>
              <div className="proof-item-head">
                <span className="check-num mono">{i + 1}</span>
                <div>
                  <p className="check-label">{item.label}</p>
                  <p className="check-instruction">{item.instruction}</p>
                </div>
              </div>

              {item.last && (
                <div className={`result ${item.required ? "result-old" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.last.url} alt={`Proof for ${item.label}`} className="result-photo" />
                  <div className="result-body">
                    <InspectionStamp verdict={item.last.verdict} />
                    <p className="result-reason">{item.last.reason}</p>
                    {item.last.verdict === "fail" && item.last.fix && (
                      <p className="result-fix">
                        <strong>Fix:</strong> {item.last.fix}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {item.required && (
                <div className="capture">
                  {previewUrl && (
                    <div className="capture-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="" />
                      {pick?.kind === "sample" && <span className="sample-tag">Sample · {pick.caption}</span>}
                    </div>
                  )}
                  <button
                    type="button"
                    className={previewUrl ? "button-quiet" : "button button-wide capture-button"}
                    onClick={() => setCameraFor(item.id)}
                    disabled={sending}
                  >
                    {previewUrl ? "Retake" : item.last ? "Retake photo" : "Take photo"}
                  </button>
                </div>
              )}

              {sending && item.required && <p className="checking">Checking this photo…</p>}
            </li>
          );
        })}
      </ol>

      {required.length > 0 && (
        <div className="proof-submit">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="button button-wide" onClick={submit} disabled={!ready || sending}>
            {sending
              ? "The agent is checking your photos…"
              : `Send ${required.length} photo${required.length > 1 ? "s" : ""} for checking`}
          </button>
          {!ready && !sending && <p className="hint">Every item needs a photo before you can send.</p>}
        </div>
      )}

      {cameraFor && (
        <CameraCapture
          onClose={() => setCameraFor(null)}
          onCapture={(file) => {
            setPick(cameraFor, { kind: "file", file, preview: URL.createObjectURL(file) });
            setCameraFor(null);
          }}
        />
      )}
    </div>
  );
}
