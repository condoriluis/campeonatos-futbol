import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getRealtimeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}

export function isRealtimeConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Se suscribe al canal broadcast de un partido.
 * Devuelve una función para desuscribirse.
 */
export function subscribeMatch(matchId: string, onMessage: (payload: unknown) => void): () => void {
  const client = getRealtimeClient();
  if (!client) return () => {};

  let channel: RealtimeChannel | null = null;
  try {
    channel = client.channel(`match:${matchId}`);
    channel
      .on("broadcast", { event: "match:update" }, (payload) => {
        if (payload && typeof payload === "object" && "source" in payload && payload.source === "server") {
          onMessage(payload);
        }
      })
      .subscribe();
  } catch (error) {
    console.error("Realtime subscribe error:", error);
    return () => {};
  }

  return () => {
    try {
      client?.removeChannel(channel!).catch(() => {});
    } catch {
      /* noop */
    }
  };
}

export function subscribeStandings(tournamentId: string, onMessage: () => void): () => void {
  const client = getRealtimeClient();
  if (!client) return () => {};
  let channel: RealtimeChannel | null = null;
  try {
    channel = client.channel(`standings:${tournamentId}`);
    channel
      .on("broadcast", { event: "standings:update" }, () => onMessage())
      .subscribe();
  } catch (error) {
    console.error("Realtime subscribe standings error:", error);
    return () => {};
  }
  return () => {
    try {
      client?.removeChannel(channel!).catch(() => {});
    } catch {
      /* noop */
    }
  };
}