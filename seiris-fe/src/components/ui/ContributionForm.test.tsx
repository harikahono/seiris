import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContributionForm from "@/components/ui/ContributionForm";

const mockPost = vi.fn().mockResolvedValue({ data: {} });
vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { features: {} } }),
    post: (...args: unknown[]) => mockPost(...(args as [])),
  },
}));

describe("ContributionForm", () => {
  const onCreated = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    mockPost.mockClear();
    onCreated.mockClear();
    onClose.mockClear();
  });

  it("submits a CASH contribution with the correct payload", async () => {
    render(
      <ContributionForm teamId="t1" fmr={50000} commissionRate={50} open onClose={onClose} onCreated={onCreated} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByText("Cash"));

    await user.type(
      screen.getByPlaceholderText("Deskripsi kontribusi (min 5 karakter)"),
      "Modal awal",
    );
    await user.type(screen.getByPlaceholderText("500.000"), "1000000");

    await user.click(screen.getByRole("button", { name: /Buat Kontribusi/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [url, payload] = mockPost.mock.calls[0];
    expect(url).toBe("/teams/t1/contributions");
    // component sends FormData (for file upload support)
    expect(payload.get("type")).toBe("CASH");
    expect(payload.get("description")).toBe("Modal awal");
    expect(payload.get("amount")).toBe("1000000");
    expect(payload.get("project_id")).toBeNull();

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });
});
