"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Item = { label: string; photoInstruction: string };

/** Linda's plan: read it, or edit the amount and checklist before approving. */
export function PlanEditor({
  jobId,
  amountCents,
  checklist,
  editable,
}: {
  jobId: string;
  amountCents: number;
  checklist: Item[];
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState((amountCents / 100).toFixed(2));
  const [items, setItems] = useState<Item[]>(checklist);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd: Number(amount), checklist: items }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "Couldn't save. Try again.");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        <ol className="checklist">
          {checklist.map((item, i) => (
            <li key={i}>
              <span className="check-num mono">{i + 1}</span>
              <div>
                <p className="check-label">{item.label}</p>
                <p className="check-instruction">{item.photoInstruction}</p>
              </div>
            </li>
          ))}
        </ol>
        {editable && (
          <button type="button" className="button-quiet" onClick={() => setEditing(true)}>
            Edit amount or checklist
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="plan-edit">
      <label className="field">
        <span className="field-label">Amount (USD)</span>
        <input
          className="mono amount-input"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </label>
      <span className="field-label">Proof photos Marco must take</span>
      {items.map((item, i) => (
        <div key={i} className="edit-item">
          <span className="check-num mono">{i + 1}</span>
          <div className="edit-item-fields">
            <input value={item.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Name" />
            <textarea
              rows={2}
              value={item.photoInstruction}
              onChange={(e) => update(i, { photoInstruction: e.target.value })}
              placeholder="What the photo must show"
            />
          </div>
          {items.length > 1 && (
            <button
              type="button"
              className="button-quiet small"
              onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
              aria-label={`Remove item ${i + 1}`}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {items.length < 6 && (
        <button
          type="button"
          className="button-quiet"
          onClick={() => setItems((prev) => [...prev, { label: "", photoInstruction: "" }])}
        >
          + Add a photo
        </button>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="edit-actions">
        <button type="button" className="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save plan"}
        </button>
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            setEditing(false);
            setItems(checklist);
            setAmount((amountCents / 100).toFixed(2));
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
