import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!serverClient) {
    serverClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return serverClient;
}

/**
 * Difunde una actualización de partido a todos los suscriptores del canal.
 * Usa la service role key en el servidor (nunca expuesta al cliente).
 * Nunca lanza errores: si Supabase no está configurado, simplemente no ocurre nada
 * y los clientes siguen funcionando con polling.
 */
export async function broadcastMatchUpdate(matchId: string, payload: unknown) {
  const client = getServiceClient();
  if (!client) return;

  try {
    const channel = client.channel(`match:${matchId}`);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({
          type: "broadcast",
          event: "match:update",
          payload: { matchId, source: "server", ...(payload as object) },
        });
      }
      await new Promise((r) => setTimeout(r, 50));
      await client.removeChannel(channel);
    });
  } catch (error) {
    console.error("Realtime broadcast error:", error);
  }
}

/** Canal para invalidar vistas de tablas/clasificación al cambiar resultados */
export async function broadcastStandingsUpdate(tournamentId: string) {
  const client = getServiceClient();
  if (!client) return;
  try {
    const channel = client.channel(`standings:${tournamentId}`);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({
          type: "broadcast",
          event: "standings:update",
          payload: { tournamentId, source: "server" },
        });
      }
      await new Promise((r) => setTimeout(r, 50));
      await client.removeChannel(channel);
    });
  } catch (error) {
    console.error("Realtime standings error:", error);
  }
}