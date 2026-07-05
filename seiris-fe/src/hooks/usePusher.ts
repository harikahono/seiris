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
 * FIXED: React StrictMode was causing double-invoke of useEffect which led to
 * rapid connect/disconnect cycles that corrupted WebSocket state.
 *
 * - No debounce on cleanup (immediate disconnect)
 * - Check Pusher internal connection.state before connecting
 * - Single connection per teamId
 * - callbacksRef to avoid effect re-run on inline callback object recreation
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
  callbacksRef.current = callbacks;

  useEffect(() => {
    // Skip if no teamId
    if (!teamId) return;

    // Skip if already connected to this teamId
    if (
      pusherRef.current &&
      teamIdRef.current === teamId &&
      pusherRef.current.connection.state === "connected"
    ) {
      console.log("[usePusher] Already connected to", teamId, "- skipping");
      return;
    }

    // Clean up existing connection if teamId changed
    if (pusherRef.current && teamIdRef.current !== teamId) {
      console.log("[usePusher] Team changed, disconnecting old connection");
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!appKey || !cluster) {
      console.warn("[usePusher] Missing Pusher env vars");
      return;
    }

    // Create Pusher instance
    const pusher = new Pusher(appKey, {
      cluster,
      forceTLS: true,
      channelAuthorization: {
        endpoint: `${
          import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"
        }/broadcasting/auth`,
        transport: "ajax",
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    pusherRef.current = pusher;
    teamIdRef.current = teamId;

    // Handle connection success
    pusher.connection.bind("connected", () => {
      console.log("[usePusher] Connected to Pusher");
    });

    // Handle connection error
    pusher.connection.bind("error", (err: any) => {
      console.error("[usePusher] Connection error:", err);
    });

    // Handle connection closed
    pusher.connection.bind("closed", () => {
      console.log("[usePusher] Connection closed");
    });

    // Handle state changes
    pusher.connection.bind("state_change", (states: { current: string; previous: string }) => {
      console.log(`[usePusher] State changed: ${states.previous} -> ${states.current}`);
    });

    // Handle connecting state
    pusher.connection.bind("connecting", () => {
      console.log("[usePusher] Connecting...");
    });

    // Handle unavailable
    pusher.connection.bind("unavailable", () => {
      console.warn("[usePusher] Connection unavailable");
    });

    // Subscribe to PRESENCE channel — match backend PresenceChannel('team.{id}')
    const channel = pusher.subscribe(`presence-team.${teamId}`);

    // Handle subscription success (presence returns members data)
    channel.bind("pusher:subscription_succeeded", (members: any) => {
      console.log("[usePusher] Subscribed to presence channel:", `presence-team.${teamId}`, "members:", members.count ?? Object.keys(members.members ?? {}).length);
    });

    // Handle subscription error
    channel.bind("pusher:subscription_error", (err: any) => {
      console.error("[usePusher] Subscription error:", err);
    });

    // Bind equity.updated event
    channel.bind("equity.updated", () => {
      console.log("[usePusher] Received equity.updated event!");
      callbacksRef.current.onEquityUpdated?.();
    });

    // Bind contribution.created event
    channel.bind("contribution.created", (data: ContributionCreatedData) => {
      console.log("[usePusher] Received contribution.created event:", data);
      callbacksRef.current.onContributionCreated?.(data);
    });

    // Bind team.updated event (revenue, member, FMR, freeze, etc)
    channel.bind("team.updated", () => {
      console.log("[usePusher] Received team.updated event");
      callbacksRef.current.onTeamUpdated?.();
    });

    // Cleanup on unmount - IMMEDIATE, no debounce
    return () => {
      console.log("[usePusher] Cleaning up connection");
      if (pusherRef.current === pusher) {
        pusher.disconnect();
        pusherRef.current = null;
        teamIdRef.current = undefined;
      }
    };
  }, [teamId]);
}