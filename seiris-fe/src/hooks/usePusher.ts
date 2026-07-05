import { useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";

interface PresenceUser {
  id: string;
  name: string;
  member_id: string;
  role: string;
}

type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

/**
 * Subscribe to Pusher presence channel for a team.
 *
 * Handles React Strict Mode double-invoke by using connection state guards.
 * Prevents rapid connect/disconnect cycles that corrupt WebSocket state.
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
  const connectionStateRef = useRef<ConnectionState>("idle");
  const pusherRef = useRef<Pusher | null>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    // Clear any pending cleanup timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Debounce cleanup to prevent race conditions with React Strict Mode
    cleanupTimeoutRef.current = setTimeout(() => {
      if (pusherRef.current) {
        try {
          const pusher = pusherRef.current;
          pusherRef.current = null;
          connectionStateRef.current = "disconnected";
          pusher.disconnect();
        } catch (e) {
          console.warn('[usePusher] Cleanup error:', e);
        }
      }
    }, 100);
  }, []);

  useEffect(() => {
    // Guard: no teamId or token
    if (!teamId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    // Guard: check env vars
    const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!appKey || !cluster) {
      console.warn('[usePusher] Missing Pusher env vars');
      return;
    }

    // Guard: already connecting or connected — prevent duplicate connections
    if (
      connectionStateRef.current === "connecting" ||
      connectionStateRef.current === "connected"
    ) {
      console.log('[usePusher] Already connecting/connected, skipping');
      return;
    }

    connectionStateRef.current = "connecting";

    // Create Pusher instance
    const pusher = new Pusher(appKey, {
      cluster,
      channelAuthorization: {
        endpoint: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"}/broadcasting/auth`,
        transport: "ajax",
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    pusherRef.current = pusher;

    // Subscribe to channel
    const channel = pusher.subscribe(`team.${teamId}`);

    // Handle subscription success
    channel.bind("pusher:subscription_succeeded", () => {
      connectionStateRef.current = "connected";
      console.log('[usePusher] Connected to channel:', `team.${teamId}`);
    });

    // Handle connection error
    pusher.connection.bind("error", (err: any) => {
      console.error('[usePusher] Connection error:', err);
      connectionStateRef.current = "disconnected";
    });

    // Handle connection closed
    pusher.connection.bind("closed", () => {
      console.log('[usePusher] Connection closed');
      connectionStateRef.current = "disconnected";
    });

    // Bind equity.updated event
    channel.bind("equity.updated", () => {
      console.log('[usePusher] Received equity.updated event');
      callbacks.onEquityUpdated?.();
    });

    // Bind members change (optional)
    channel.bind("pusher:member_added", (member: any) => {
      console.log('[usePusher] Member added:', member);
    });

    channel.bind("pusher:member_removed", (member: any) => {
      console.log('[usePusher] Member removed:', member);
    });

    // Cleanup on unmount
    return () => {
      // Only cleanup if this is the same pusher instance
      if (pusherRef.current === pusher) {
        cleanup();
      }
    };
  }, [teamId, cleanup, callbacks]);
}