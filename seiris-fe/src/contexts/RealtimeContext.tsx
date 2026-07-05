import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface RealtimeContextValue {
  /** Incremented every time a Pusher equity.updated event arrives */
  refreshVersion: number;
  /** Manual trigger to refresh data on this page */
  triggerRefresh: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [refreshVersion, setRefreshVersion] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshVersion((v) => v + 1);
  }, []);

  return (
    <RealtimeContext.Provider value={{ refreshVersion, triggerRefresh }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}
