"use client";

import { useEffect, useRef, useState } from "react";
import { isRealtimeConfigured, subscribeMatch } from "@/lib/realtime/client";

const POLL_INTERVAL = 4000;
const REALTIME_GRACE_MS = 7000;

/**
 * Hook para mantener una vista de partido sincronizada en tiempo real.
 * Usa Supabase Realtime (broadcast). Si no está configurado o no llegan
 * mensajes, cae a polling contra la API cada 4s.
 */
export function useLiveMatch<T>(matchId: string, fetcher: () => Promise<T>): {
  state: T | null;
  connected: boolean;
  stale: boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const lastMessage = useRef(0);

  const load = useRef(async () => {
    try {
      const data = await fetcher();
      setState(data);
      lastMessage.current = Date.now();
    } catch (error) {
      console.error("Live match fetch error:", error);
    }
  });

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let unsubscribe = () => {};

    const healthy = () => Date.now() - lastMessage.current < REALTIME_GRACE_MS;

    const refresh = async () => {
      if (cancelled) return;
      await load.current();
      setStale(false);
    };

    const start = async () => {
      await refresh();

      if (isRealtimeConfigured()) {
        unsubscribe = subscribeMatch(matchId, () => {
          lastMessage.current = Date.now();
          setConnected(true);
          refresh();
        });
        // si en 7s no llega nada real, marcamos connected=false (modo polling)
        setTimeout(() => {
          if (!cancelled && !healthy()) {
            setConnected(false);
          }
        }, REALTIME_GRACE_MS);
      } else {
        setConnected(false);
      }

      interval = setInterval(async () => {
        if (cancelled) return;
        if (healthy()) return; // realtime fresco, no pollear
        setStale(false);
        await refresh();
      }, POLL_INTERVAL);
    };

    start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      unsubscribe();
    };
  }, [matchId]);

  return {
    state,
    connected,
    stale,
    refresh: async () => {
      await load.current();
    },
  };
}