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

interface EquityUpdatedData {
  snapshot_id: string;
  total_slices: number;
  equity_map: Record<string, unknown>;
  is_frozen: boolean;
  updated_at: string;
  approved_by: string | null;
  contribution_desc: string | null;
}

interface TeamUpdatedData {
  team_id: string;
  timestamp: string;
  action: string;
  user_name: string;
  contribution_desc: string | null;
}

/**
 * Subscribe to Pusher presence channel for a team.
 *
 * Usage:
 *   usePusher(teamId, {
 *     onEquityUpdated: (data) => { fetchEquity(); toast("Equity updated!"); },
 *   });
 */
export function usePusher(
  teamId: string | undefined,
  callbacks: {
    onEquityUpdated?: (data: EquityUpdatedData) => void;
    onContributionCreated?: (data: ContributionCreatedData) => void;
    onTeamUpdated?: (data: TeamUpdatedData) => void;
    onMembersChange?: (members: PresenceUser[]) => void;
  } = {}
) {
  const pusherRef = useRef<Pusher | null>(null);
  const teamIdRef = useRef<string | undefined>(undefined);
  const callbacksRef = useRef(callbacks);
  const membersRef = useRef<PresenceUser[]>([]);

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

    channel.bind("equity.updated", (data: EquityUpdatedData) => {
      callbacksRef.current.onEquityUpdated?.(data);
    });

    channel.bind("contribution.created", (data: ContributionCreatedData) => {
      callbacksRef.current.onContributionCreated?.(data);
    });

    channel.bind("team.updated", (data: TeamUpdatedData) => {
      callbacksRef.current.onTeamUpdated?.(data);
    });

    // ── Presence tracking ──
    channel.bind("pusher:subscription_succeeded", (members: { members: Record<string, unknown>; count: number }) => {
      const list: PresenceUser[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (members as any).each?.((member: any) => {
        list.push(member.info as PresenceUser);
      });
      membersRef.current = list;
      callbacksRef.current.onMembersChange?.(list);
    });

    channel.bind("pusher:member_added", (member: { user_id: string; user_info: PresenceUser }) => {
      const exists = membersRef.current.some((m) => m.id === member.user_info.id);
      if (!exists) {
        membersRef.current = [...membersRef.current, member.user_info];
        callbacksRef.current.onMembersChange?.(membersRef.current);
      }
    });

    channel.bind("pusher:member_removed", (member: { user_id: string }) => {
      membersRef.current = membersRef.current.filter((m) => m.id !== member.user_id);
      callbacksRef.current.onMembersChange?.(membersRef.current);
    });

    return () => {
      if (pusherRef.current === pusher) {
        pusher.disconnect();
        pusherRef.current = null;
        teamIdRef.current = undefined;
        membersRef.current = [];
      }
    };
  }, [teamId]);
}