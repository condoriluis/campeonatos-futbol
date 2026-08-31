import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type ActaEvent = {
  minute: number | null;
  type: string;
  teamId: string;
  teamName: string;
  playerName: string;
  note: string;
};

export type ActaData = {
  tournament: string;
  category: string;
  phase: string;
  matchLabel: string | null;
  groupName: string | null;
  venue: string | null;
  scheduledAt: string;
  homeName: string;
  homeScore: number;
  awayName: string;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerName: string | null;
  usePenalties: boolean;
  events: ActaEvent[];
  operator: string | null;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 9 },
  title: { fontSize: 16, textAlign: "center", fontWeight: "bold" },
  subtitle: { fontSize: 8, textAlign: "center", color: "#444", marginTop: 4 },
  meta: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#444" },
  scoreRow: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  teamName: { fontSize: 12, flex: 1, textAlign: "center" },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  score: { fontSize: 22, fontWeight: "bold", textAlign: "center", width: 34 },
  penalt: { fontSize: 7, color: "#555", textAlign: "center", marginTop: 2 },
  winner: { marginTop: 8, fontSize: 8, textAlign: "center", color: "#047857" },
  section: { marginTop: 16, fontSize: 10, fontWeight: "bold", borderBottom: 1, borderBottomColor: "#bbb", paddingBottom: 3 },
  row: { flexDirection: "row", fontSize: 8, paddingVertical: 3, borderBottom: 0.5, borderBottomColor: "#ddd", alignItems: "center" },
  cellTime: { width: 34 },
  cellTeam: { width: 118, paddingLeft: 4 },
  cellDetail: { flex: 1, paddingLeft: 4 },
  eventLabel: { width: 52, fontWeight: "bold" },
  signatureRow: { marginTop: 34, flexDirection: "row", justifyContent: "space-between" },
  signatureBox: { width: 160, textAlign: "center", fontSize: 8 },
  signatureLine: { marginTop: 36, borderTop: 0.5, borderTopColor: "#000", paddingTop: 3 },
});

const eventLabel: Record<string, string> = { GOL: "Gol", AMARILLA: "Amarilla", ROJA: "Roja", CAMBIO: "Cambio" };

export function ActaDocument({ data }: { data: ActaData }) {
  const penal =
    data.usePenalties && data.homePenalties != null && data.awayPenalties != null
      ? `Penales: ${data.homePenalties} - ${data.awayPenalties}`
      : null;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Acta de partido</Text>
        <Text style={styles.subtitle}>
          {data.tournament} · {data.category} · {data.phase}
          {data.matchLabel ? ` · ${data.matchLabel}` : ""}
          {data.groupName ? ` · Grupo ${data.groupName}` : ""}
        </Text>
        <View style={styles.meta}>
          <Text>{data.venue || "Sin sede"}</Text>
          <Text>{data.scheduledAt}</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.teamName}>{data.homeName}</Text>
          <View style={styles.scoreBox}>
            <View>
              <Text style={styles.score}>{data.homeScore}</Text>
              {penal ? <Text style={styles.penalt}>Pen {data.homePenalties}</Text> : null}
            </View>
            <Text style={{ fontSize: 16 }}>-</Text>
            <View>
              <Text style={styles.score}>{data.awayScore}</Text>
              {penal ? <Text style={styles.penalt}>Pen {data.awayPenalties}</Text> : null}
            </View>
          </View>
          <Text style={styles.teamName}>{data.awayName}</Text>
        </View>
        {data.winnerName ? <Text style={styles.winner}>Ganador: {data.winnerName}</Text> : null}

        <Text style={styles.section}>Eventos</Text>
        {data.events.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#777", marginTop: 6 }}>Sin eventos registrados.</Text>
        ) : (
          data.events.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellTime}>{e.minute != null ? `${e.minute}′` : "—"}</Text>
              <Text style={styles.cellTeam}>{e.teamName}</Text>
              <Text style={styles.eventLabel}>{eventLabel[e.type] ?? e.type}</Text>
              <Text style={styles.cellDetail}>
                {e.playerName}
                {e.note ? ` · ${e.note}` : ""}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Observaciones</Text>
        <Text style={{ marginTop: 6, fontSize: 7, color: "#555" }}>
          Reglas y conducta: las tarjetas se registran según el reglamento vigente del campeonato.
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Árbitro</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Capitán local</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Capitán visita</Text>
          </View>
        </View>

        <Text style={{ marginTop: 28, fontSize: 7, textAlign: "center", color: "#888" }}>
          Operador: {data.operator ?? "—"} · Generado por Campeonatos
        </Text>
      </Page>
    </Document>
  );
}