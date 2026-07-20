import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  icon?: ReactNode;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Yakin",
  cancelText = "Batal",
  variant = "primary",
  loading = false,
  icon,
}: ConfirmModalProps) {
  const trapRef = useFocusTrap(open);
  if (!open) return null;

  const isDanger = variant === "danger";
  const btnClass = isDanger
    ? "bg-red-500 hover:bg-red-600 text-white"
    : "bg-accent hover:bg-accent-hover text-black";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div ref={trapRef} className="relative w-80 rounded-xl border border-gray-700 bg-card p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          {icon ?? (
            <div className={`flex size-12 items-center justify-center rounded-full ${isDanger ? "bg-red-500/10" : "bg-accent/10"}`}>
              {isDanger ? (
                <AlertTriangle className={`size-6 ${isDanger ? "text-red-400" : "text-accent"}`} />
              ) : (
                <AlertTriangle className="size-6 text-accent" />
              )}
            </div>
          )}
          <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${btnClass}`}
          >
            {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
