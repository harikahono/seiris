import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("renders PENDING as 'Pending'", () => {
    render(<StatusBadge status="PENDING" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders APPROVED as 'Disetujui'", () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText("Disetujui")).toBeInTheDocument();
  });

  it("renders REJECTED as 'Ditolak'", () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText("Ditolak")).toBeInTheDocument();
  });
});
