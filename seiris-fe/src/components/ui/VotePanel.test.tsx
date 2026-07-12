import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VotePanel from "@/components/ui/VotePanel";

vi.mock("@/api/axios", () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}));

describe("VotePanel", () => {
  const onVoted = vi.fn();
  const contribution = {
    id: "c1",
    status: "PENDING",
    description: "Test kontribusi",
    member: { id: "member-other" },
    approvals: [],
  };

  beforeEach(() => { onVoted.mockClear(); });

  it("submits APPROVE vote with note and calls onVoted", async () => {
    render(<VotePanel contribution={contribution as any} currentMemberId="member-me" onVoted={onVoted} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Setuju"));
    await user.type(screen.getByPlaceholderText("Catatan (opsional)"), "Oke gas");

    await user.click(screen.getByRole("button", { name: /Kirim Vote/i }));

    await waitFor(async () => {
      const axios = await import("@/api/axios");
      expect(vi.mocked(axios.default.post)).toHaveBeenCalledWith(
        "/contributions/c1/vote",
        expect.objectContaining({ vote: "APPROVE", note: "Oke gas" }),
      );
    });
    await waitFor(() => expect(onVoted).toHaveBeenCalled());
  });

  it("submits REJECT vote with no note", async () => {
    render(<VotePanel contribution={contribution as any} currentMemberId="member-me" onVoted={onVoted} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Tolak"));
    await user.click(screen.getByRole("button", { name: /Kirim Vote/i }));

    await waitFor(async () => {
      const axios = await import("@/api/axios");
      expect(vi.mocked(axios.default.post)).toHaveBeenCalledWith(
        "/contributions/c1/vote",
        expect.objectContaining({ vote: "REJECT" }),
      );
    });
    await waitFor(() => expect(onVoted).toHaveBeenCalled());
  });

  it("shows locked note and hides vote buttons when frozen", () => {
    render(<VotePanel contribution={contribution as any} currentMemberId="member-me" onVoted={onVoted} frozen />);

    expect(screen.getByText(/sudah dikunci/i)).toBeDefined();
    expect(screen.queryByText("Setuju")).toBeNull();
    expect(screen.queryByText("Tolak")).toBeNull();
    expect(screen.queryByRole("button", { name: /Kirim Vote/i })).toBeNull();
  });
});
