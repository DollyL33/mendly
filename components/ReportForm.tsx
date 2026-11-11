"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Result = { jobId: string; planned: boolean; message?: string };

export function ReportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const ready = text.trim().length >= 5 && photo !== null;

  async function useExample() {
    setText("The kitchen tap keeps dripping even when it's turned off. It's been like this for two days.");
    const blob = await fetch("/samples/seed-report.jpg").then((r) => r.blob());
    choosePhoto(new File([blob], "example-report.jpg", { type: "image/jpeg" }));
  }

  function choosePhoto(file: File | undefined) {
    setPhoto(file ?? null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !photo) return;
    setSending(true);
    setError(null);
    const body = new FormData();
    body.set("text", text.trim());
    body.set("photo", photo);
    try {
      const res = await fetch("/api/reports", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      setResult(data);
      setText("");
      choosePhoto(undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="card sent">
        <p className="sent-title">Report sent to Linda.</p>
        <p className="muted">
          {result.planned
            ? "Mendly has turned it into a job plan for her to approve."
            : `Your report is saved. ${result.message ?? ""}`}
        </p>
        <div className="sent-actions">
          <Link href={`/linda/jobs/${result.jobId}`} className="button">
            Continue as Linda →
          </Link>
          <button type="button" className="button-quiet" onClick={() => setResult(null)}>
            Report another problem
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card report-form" onSubmit={submit}>
      <div className="example-row">
        <span className="muted small">Trying the demo?</span>
        <button type="button" className="button-quiet small" onClick={useExample} disabled={sending}>
          Use an example report
        </button>
      </div>
      <label className="field">
        <span className="field-label">What's wrong?</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="The kitchen tap has been dripping for two days and it's getting worse."
          rows={3}
          maxLength={1000}
          disabled={sending}
        />
      </label>

      <div className="field">
        <span className="field-label">Photo of the problem</span>
        <label className={preview ? "photo-drop has-photo" : "photo-drop"}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo of the problem" />
          ) : (
            <span>Take or choose a photo</span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
            disabled={sending}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="button button-wide" disabled={!ready || sending}>
        {sending ? "Sending, and planning the job…" : "Send report"}
      </button>
      {!ready && !sending && <p className="hint">Add a sentence and a photo to send.</p>}
    </form>
  );
}
