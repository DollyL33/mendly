import { TopBar } from "@/components/TopBar";

export default function MarcoPage() {
  return (
    <>
      <TopBar role="marco" />
      <main className="page narrow">
        <p className="eyebrow">Marco · handyman</p>
        <h1>Your jobs</h1>
        <p className="empty">Jobs appear here once Linda has approved them and the money is held.</p>
      </main>
    </>
  );
}
