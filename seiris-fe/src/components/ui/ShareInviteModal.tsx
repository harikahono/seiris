import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Link2, Check, MessageCircle, Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalAnimation } from "@/hooks/useModalAnimation";

interface Props {
  open: boolean;
  onClose: () => void;
  teamName: string;
  inviteCode: string;
}

export default function ShareInviteModal({ open, onClose, teamName, inviteCode }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const { show, animClass, animateClose } = useModalAnimation(open);
  const trapRef = useFocusTrap(show);

  // Escape nutup modal
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') animateClose(onClose);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, animateClose, onClose]);

  if (!show) return null;

  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  const copyUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback: textarea + execCommand buat browser non-HTTPS / lama
        const ta = document.createElement("textarea");
        ta.value = inviteUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      toast.success("Tautan disalin");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  };

  const openLink = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const shareWA = () => {
    const msg = `Ayo gabung tim "${teamName}" di SEIRIS!\nKode undangan: ${inviteCode}\n${inviteUrl}`;
    openLink(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const shareGmail = () => {
    const subject = `Gabung tim "${teamName}" di SEIRIS`;
    const body = `Ayo gabung tim "${teamName}" di SEIRIS!\n\nKode undangan: ${inviteCode}\n${inviteUrl}`;
    openLink(`https://mail.google.com/mail/u/0/?tf=cm&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => animateClose(onClose)}>
      <div ref={trapRef} className={`${animClass} w-full max-w-sm rounded-xl border border-gray-700 bg-card p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Bagikan Undangan</h2>
          <button type="button" onClick={() => animateClose(onClose)} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors active:scale-[0.97]" aria-label="Tutup" title="Tutup">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-6 text-xs text-gray-500">ke Tim &ldquo;{teamName}&rdquo;</p>

        {/* Share options row */}
        <div className="flex items-start justify-center gap-6">
          {/* Copy link */}
          <button type="button" onClick={copyUrl} className="flex flex-col items-center gap-2 group">
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-[background-color,border-color,transform] duration-200 var(--ease-out) group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              {copiedLink ? <Check className="size-6 text-green-400" /> : <Link2 className="size-6 text-gray-300" />}
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Salin Tautan</span>
          </button>

          {/* WhatsApp */}
          <button type="button" onClick={shareWA} className="flex flex-col items-center gap-2 group" style={{ animationDelay: "80ms" }}>
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-[background-color,border-color,transform] duration-200 var(--ease-out) group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              <MessageCircle className="size-6 text-gray-300" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">WhatsApp</span>
          </button>

          {/* Gmail */}
          <button type="button" onClick={shareGmail} className="flex flex-col items-center gap-2 group" style={{ animationDelay: "160ms" }}>
            <div className="flex size-14 md:size-16 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-[background-color,border-color,transform] duration-200 var(--ease-out) group-hover:bg-accent/15 group-hover:border-accent/30 group-hover:scale-105 animate-fade-in-up">
              <Mail className="size-6 text-gray-300" />
            </div>
            <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors">Gmail</span>
          </button>
        </div>

        {/* URL box */}
        <div
          onClick={copyUrl}
          className="mt-6 flex animate-fade-in-up cursor-pointer items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/30 px-3 py-2.5 transition-colors hover:border-gray-600 hover:bg-gray-800/60"
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
