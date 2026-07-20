import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Link2, Check, MessageCircle, Mail, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  teamName: string;
  inviteCode: string;
}

export default function ShareInviteModal({ open, onClose, teamName, inviteCode }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!open) return null;

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success("Tautan disalin");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  };

  const shareWA = () => {
    const msg = `Ayo gabung tim "${teamName}" di SEIRIS!\nKode undangan: ${inviteCode}\n${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareGmail = () => {
    const subject = `Gabung tim "${teamName}" di SEIRIS`;
    const body = `Ayo gabung tim "${teamName}" di SEIRIS!\n\nKode undangan: ${inviteCode}\n${inviteUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-fade-in-up rounded-xl border border-gray-800 bg-[#0d0d0d] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Bagikan Undangan</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-6 text-xs text-gray-500">ke Tim &ldquo;{teamName}&rdquo;</p>

        {/* Share options row */}
        <div className="flex items-start justify-center gap-6">
          {/* Copy link */}
          <button type="button" onClick={copyUrl} className="flex flex-col items-center gap-2 group">
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-all duration-200 group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              {copiedLink ? <Check className="size-6 text-green-400" /> : <Link2 className="size-6 text-gray-300" />}
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Salin Tautan</span>
          </button>

          {/* WhatsApp */}
          <button type="button" onClick={shareWA} className="flex flex-col items-center gap-2 group" style={{ animationDelay: "80ms" }}>
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-all duration-200 group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              <MessageCircle className="size-6 text-gray-300" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">WhatsApp</span>
          </button>

          {/* Gmail */}
          <button type="button" onClick={shareGmail} className="flex flex-col items-center gap-2 group" style={{ animationDelay: "160ms" }}>
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-all duration-200 group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              <Mail className="size-6 text-gray-300" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Gmail</span>
          </button>
        </div>

        {/* URL box */}
        <div
          onClick={copyUrl}
          className="mt-6 flex animate-fade-in-up cursor-pointer items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/30 px-3 py-2.5 transition hover:border-gray-600 hover:bg-gray-800/60"
          style={{ animationDelay: "240ms" }}
        >
          <span className="flex-1 truncate font-mono text-sm text-gray-400">{inviteUrl}</span>
          <Copy className="size-3.5 shrink-0 text-gray-500" />
        </div>
      </div>
    </div>,
    document.body
  );
}
