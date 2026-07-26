import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalAnimation } from "@/hooks/useModalAnimation";

interface ProofPreviewModalProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

export default function ProofPreviewModal({ url, open, onClose }: ProofPreviewModalProps) {
  const { show, animClass, animateClose } = useModalAnimation(open);
  const trapRef = useFocusTrap(show);
  const isPdf = /\.pdf$/i.test(url);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") animateClose(onClose);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => animateClose(onClose)}
    >
      <div
        ref={trapRef}
        className={`${animClass} relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-card shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <span className="text-sm font-medium text-gray-300">Bukti Transaksi</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Buka di tab baru
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors active:scale-[0.97]"
              aria-label="Tutup" title="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center overflow-auto p-4">
          {isPdf ? (
            <iframe src={url} title="Bukti" className="h-[75vh] w-full rounded-lg bg-white" />
          ) : (
            <img
              src={url}
              alt="Bukti"
              className="max-h-[75vh] w-auto rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
