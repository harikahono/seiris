import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTeamModal from "@/components/ui/CreateTeamModal";

vi.mock("@/api/axios", () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { data: { id: "t1" } } }) },
}));

describe("CreateTeamModal — create tab", () => {
  const onCreated = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => { onCreated.mockClear(); onClose.mockClear(); });

  it("submits create form with correct payload and calls onCreated with team id", async () => {
    render(<CreateTeamModal open onClose={onClose} onCreated={onCreated} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Nama tim kamu"), "Team Ku");
    await user.click(screen.getByText(/50\+1.*Mayoritas/));
    await user.click(screen.getAllByRole("button", { name: /Buat Tim/i })[1]); // submit bawah

    await waitFor(async () => {
      const axios = await import("@/api/axios");
      expect(vi.mocked(axios.default.post)).toHaveBeenCalledWith("/teams", expect.objectContaining({
        name: "Team Ku",
        approval_threshold: "50",
        fmr: 150000,
      }));
    });

    expect(onCreated).toHaveBeenCalledWith("t1");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("CreateTeamModal — join tab", () => {
  const onCreated = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => { onCreated.mockClear(); onClose.mockClear(); });

  it("submits join form with invite code and calls onCreated", async () => {
    render(<CreateTeamModal open onClose={onClose} onCreated={onCreated} />);
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: /Gabung Tim/i })[0]); // tab
    await user.type(screen.getByPlaceholderText("Contoh: ABC123DE"), "ABCD1234");
    await user.click(screen.getAllByRole("button", { name: /Gabung Tim/i })[1]); // submit

    await waitFor(async () => {
      const axios = await import("@/api/axios");
      expect(vi.mocked(axios.default.post)).toHaveBeenCalledWith("/teams/join", {
        invite_code: "ABCD1234",
      });
    });

    expect(onCreated).toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
