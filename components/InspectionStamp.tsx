/** The agent's verdict, shown like an inspector's stamp beside the photo. */
export function InspectionStamp({ verdict }: { verdict: "pass" | "fail" | null }) {
  if (verdict === "pass") return <span className="stamp stamp-ok">Verified</span>;
  if (verdict === "fail") return <span className="stamp stamp-problem">Problem</span>;
  return <span className="stamp stamp-neutral">Not checked</span>;
}
