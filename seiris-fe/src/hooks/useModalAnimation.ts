import { useState, useEffect, useRef, useCallback } from "react";

export function useModalAnimation(open: boolean, duration = 150) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // If parent re-opens while closing, cancel exit
  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setClosing(false);
    }
  }, [open]);

  const animateClose = useCallback(
    (onClose: () => void) => {
      if (closing) return;
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setClosing(false);
        onClose();
      }, duration);
    },
    [closing, duration],
  );

  const show = open || closing;
  if (!show) return { show: false as const, animClass: "", animateClose };

  return {
    show: true as const,
    animClass: closing ? "modal-exit" : "modal-enter",
    animateClose,
  };
}
