import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

interface PresenceUser {
  id: string;
  name: string;
  member_id: string;
  role: string;
}

/**
 * Subscribe to Pusher presence channel for a team.
 *
 * Pusher fires `equity.updated` → callbacks.onEquityUpdated
 * Gunakan callback untuk refetch data dari API (lebih reliable daripada
 * parsing raw payload dari Pusher yang formatnya beda sama API response).
 *
 * Usage:
 *   usePusher(teamId, {
 *     onEquityUpdated: () => { fetchEquity(); toast("Equity updated!"); },
 *   });
 */
export function usePusher(
  teamId: string | undefined,
  callbacks: {
    onEquityUpdated?: () => void;
    onMembersChange?: (members: PresenceUser[]) => void;
  } = {}
) {
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!appKey || !cluster) return;

    const pusher = new Pusher(appKey, {
      cluster,
      channelAuthorization: {
        endpoint: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/broadcasting/auth`,
        transport: "ajax",
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    pusherRef.current = pusher;

    const channel = pusher.subscribe(`presence-team.${teamId}`);

    // Equity berubah → trigger refetch
    channel.bind("equity.updated", () => {
      callbacks.onEquityUpdated?.();
    });

    // (Optional) track online members
    channel.bind("pusher:subscription_succeeded", (members: any) => {
      const list: PresenceUser[] = [];
      members.each((m: any) => list.push(m.info));
      callbacks.onMembersChange?.(list);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`presence-team.${teamId}`);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [teamId]);
}
