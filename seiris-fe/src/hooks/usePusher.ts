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
  contribution_owner: string | null;
}

interface TeamUpdatedData {
  team_id: string;
  timestamp: string;
  action: string;
  user_name: string;
  contribution_desc: string | null;
  member_name: string | null;
  project_name: string | null;
  approver_name: string | null;
  contribution_owner_name: string | null;
}

/**
 * Subscribe to Pusher presence channel for a team.
 * Uses single Pusher connection — switches channels on team change.
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
  const channelNameRef = useRef<string | undefined>(undefined);
  const callbacksRef = useRef(callbacks);
  const membersRef = useRef<PresenceUser[]>([]);

  // Keep ref in sync after render
  useEffect(() => { callbacksRef.current = callbacks; });

  // Init Pusher ONCE on mount — disconnect on unmount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!token || !appKey || !cluster) {
      if (import.meta.env.DEV) console.warn("[usePusher] Missing token or Pusher env vars");
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

    return () => {
      pusher.disconnect();
      pusherRef.current = null;
      membersRef.current = [];
    };
  }, []);

  // Switch channel when teamId changes — subscribe/unsubscribe without new connection
  useEffect(() => {
    const pusher = pusherRef.current;
    if (!pusher) return;

    const newChannel = teamId ? `presence-team.${teamId}` : undefined;

    // Same channel — skip
    if (channelNameRef.current === newChannel) return;

    // Unsubscribe old channel
    if (channelNameRef.current) {
      const oldChannel = pusher.channel(channelNameRef.current);
      if (oldChannel) {
        oldChannel.unbind_all();
        pusher.unsubscribe(channelNameRef.current);
      }
    }

    channelNameRef.current = newChannel;
    membersRef.current = [];

    if (!newChannel) return;

    // Subscribe new channel
    const channel = pusher.subscribe(newChannel);

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

    channel.bind("pusher:member_added", (member: { id: string; info: PresenceUser }) => {
      const exists = membersRef.current.some((m) => m.id === member.id);
      if (!exists) {
        membersRef.current = [...membersRef.current, member.info];
        callbacksRef.current.onMembersChange?.(membersRef.current);
      }
    });

    channel.bind("pusher:member_removed", (member: { id: string }) => {
      membersRef.current = membersRef.current.filter((m) => m.id !== member.id);
      callbacksRef.current.onMembersChange?.(membersRef.current);
    });
  }, [teamId]);
}
