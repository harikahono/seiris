import { useNavigate } from "react-router-dom";
import { FileDown } from "lucide-react";

interface ExportPdfButtonProps {
  teamId: string;
  projectId?: string | null;
}

/* Buka halaman laporan → auto-print → browser "Save as PDF".
   Hasil dirender browser (bukan dompdf), jadi chart & layout tampil sempurna. */
export default function ExportPdfButton({ teamId, projectId }: ExportPdfButtonProps) {
  const navigate = useNavigate();

  const handleExport = () => {
    const params = new URLSearchParams({ print: "1" });
    if (projectId) params.set("project", projectId);
    navigate(`/teams/${teamId}/report?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white"
    >
      <FileDown className="size-3.5" />
      Export PDF
    </button>
  );
}