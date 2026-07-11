import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { usePusher } from "@/hooks/usePusher";

vi.mock("pusher-js", () => {
  const reg = new Map<string, Map<string, (data: unknown) => void>>();
  const channels = new Map<string, { bind: (e: string, h: (d: unknown) => void) => void; unbind_all: () => void }>();
  (globalThis as Record<string, unknown>).__puseReg = reg;

  return {
    default: class PusherMock {
      constructor(_key: string, _opts: Record<string, unknown>) {
        // no-op
      }
      subscribe(name: string) {
        const handlers = new Map<string, (data: unknown) => void>();
        reg.set(name, handlers);
        const chan = {
          bind: (event: string, handler: (data: unknown) => void) => { handlers.set(event, handler); },
          unbind_all: () => { },
        };
        channels.set(name, chan);
        return chan;
      }
      unsubscribe(name: string) { channels.delete(name); reg.delete(name); }
      channel(name: string) { return channels.get(name) ?? null; }
      disconnect() { }
    },
  };
});

const bindings = (globalThis as Record<string, unknown>).__puseReg as Map<
  string,
  Map<string, (data: unknown) => void>
>;

function Harness({ teamId, onEquity }: { teamId: string | undefined; onEquity: (d: unknown) => void }) {
  usePusher(teamId, { onEquityUpdated: onEquity });
  return null;
}

describe("usePusher", () => {
  beforeEach(() => {
    bindings.clear();
    vi.stubEnv("VITE_PUSHER_APP_KEY", "test-key");
    vi.stubEnv("VITE_PUSHER_CLUSTER", "test-cluster");
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api");
    localStorage.setItem("token", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("triggers onEquityUpdated when equity.updated event fires on the channel", async () => {
    const onEquity = vi.fn();
    render(<Harness teamId="team-1" onEquity={onEquity} />);

    await waitFor(() => {
      expect(bindings.has("presence-team.team-1")).toBe(true);
    });

    const channelBindings = bindings.get("presence-team.team-1")!;
    const equityHandler = channelBindings.get("equity.updated")!;

    const payload = { snapshot_id: "s1", total_slices: 10000, equity_map: { m1: { slices: 6000 } }, is_frozen: false, updated_at: "2026-07-11T00:00:00Z" };
    equityHandler(payload);

    expect(onEquity).toHaveBeenCalledTimes(1);
    expect(onEquity).toHaveBeenCalledWith(payload);
  });

  it("switches channel when teamId changes", async () => {
    const onEquity = vi.fn();
    const { rerender } = render(<Harness teamId="team-1" onEquity={onEquity} />);

    await waitFor(() => expect(bindings.has("presence-team.team-1")).toBe(true));

    bindings.get("presence-team.team-1")!.get("equity.updated")!({ snapshot_id: "s1" });
    expect(onEquity).toHaveBeenCalledTimes(1);

    rerender(<Harness teamId="team-2" onEquity={onEquity} />);

    await waitFor(() => {
      expect(bindings.has("presence-team.team-2")).toBe(true);
      expect(bindings.has("presence-team.team-1")).toBe(false);
    });

    bindings.get("presence-team.team-2")!.get("equity.updated")!({ snapshot_id: "s2" });
    expect(onEquity).toHaveBeenCalledTimes(2);
    expect(onEquity).toHaveBeenLastCalledWith({ snapshot_id: "s2" });
  });
});
