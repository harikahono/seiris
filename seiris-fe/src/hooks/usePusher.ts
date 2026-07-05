import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

interface PresenceUser {
  id: string;
  name: string;
  member_id: string;
  role: string;
}

interface ContributionCreatedData {
  id: string;
  type: string;
  description: string;
  value: number;
  member_name: string;
  status: string;
}

/**
 * Subscribe to Pusher presence channel for a team.
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
    onContributionCreated?: (data: ContributionCreatedData) => void;
    onTeamUpdated?: () => void;
    onMembersChange?: (members: PresenceUser[]) => void;
  } = {}
) {
  const pusherRef = useRef<Pusher | null>(null);
  const teamIdRef = useRef<string | undefined>(undefined);
  const callbacksRef = useRef(callbacks);

  // Keep ref in sync after render — lint rule prevents setting ref during render
  useEffect(() => { callbacksRef.current = callbacks; });

  useEffect(() => {
    if (!teamId) return;

    // Reuse existing connection if already on this team
    if (
      pusherRef.current &&
      teamIdRef.current === teamId &&
      pusherRef.current.connection.state === "connected"
    ) {
      return;
    }

    // Disconnect if team changed
    if (pusherRef.current && teamIdRef.current !== teamId) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!appKey || !cluster) {
      if (import.meta.env.DEV) console.warn("[usePusher] Missing Pusher env vars");
      return;
    }

    const pusher = new Pusher(appKey, {
      cluster,
      forceTLS: true,
      channelAuthorization: {
        endpoint: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/broadcasting/auth`,
        transport: "ajax",
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    pusherRef.current = pusher;
    teamIdRef.current = teamId;

    // Subscribe and bind events
    const channel = pusher.subscribe(`presence-team.${teamId}`);

    channel.bind("pusher:subscription_error", () => {
      // auth fail — handled by backend logging
    });

    channel.bind("equity.updated", () => {
      callbacksRef.current.onEquityUpdated?.();
    });

    channel.bind("contribution.created", (data: ContributionCreatedData) => {
      callbacksRef.current.onContributionCreated?.(data);
    });

    channel.bind("team.updated", () => {
      callbacksRef.current.onTeamUpdated?.();
    });

    return () => {
      if (pusherRef.current === pusher) {
        pusher.disconnect();
        pusherRef.current = null;
        teamIdRef.current = undefined;
      }
    };
  }, [teamId]);
}