import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { RealtimeProvider, useRealtime } from "@/contexts/RealtimeContext";

function Reader({ onValue }: { onValue: (v: unknown) => void }) {
  const ctx = useRealtime();
  useEffect(() => { onValue(ctx); }, [ctx]);
  return null;
}

describe("RealtimeContext", () => {
  it("starts with refreshVersion = 0", async () => {
    let value: unknown;
    render(
      <RealtimeProvider>
        <Reader onValue={(v) => { value = v; }} />
      </RealtimeProvider>,
    );
    await waitFor(() => expect((value as { refreshVersion: number }).refreshVersion).toBe(0));
  });

  it("triggerRefresh increments refreshVersion", async () => {
    let value: unknown;
    render(
      <RealtimeProvider>
        <Reader onValue={(v) => { value = v; }} />
      </RealtimeProvider>,
    );
    await waitFor(() => expect((value as { refreshVersion: number }).refreshVersion).toBe(0));

    (value as { triggerRefresh: () => void }).triggerRefresh();
    await waitFor(() => expect((value as { refreshVersion: number }).refreshVersion).toBe(1));

    (value as { triggerRefresh: () => void }).triggerRefresh();
    await waitFor(() => expect((value as { refreshVersion: number }).refreshVersion).toBe(2));
  });
});
