import { useEffect, useState } from "react";

function formatRelative(date: Date, now: number): string {
  const diff = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diff < 60) return "baru saja";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function RelativeTime({ date, className }: { date: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className={className}>{formatRelative(new Date(date), now)}</span>;
}
