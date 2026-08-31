import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type FixtureRow = {
  order: number;
  jornada: number | null;
  group: string | null;
  scheduledAt: Date | null;
  venue: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

export type FixtureData = {
  tournament: string;
  category: string;
  phase: string;
  venue?: string | null;
  rows: FixtureRow[];
};

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 8 },
  title: { fontSize: 15, textAlign: "center", fontWeight: "bold" },
  subtitle: { fontSize: 8, textAlign: "center", color: "#444", marginTop: 4 },
  meta: { marginTop: 5, fontSize: 7, textAlign: "center", color: "#666" },
  jornada: { marginTop: 14, fontSize: 11, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 3 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#666", paddingVertical: 4, fontWeight: "bold", backgroundColor: "#f3f4f6" },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#ddd", alignItems: "center" },
  num: { width: 18, textAlign: "center" },
  when: { width: 58 },
  venue: { width: 92, paddingRight: 4 },
  team: { flex: 1 },
  score: { width: 30, textAlign: "center" },
  group: { width: 30, textAlign: "center" },
  state: { width: 52, textAlign: "center" },
  vs: { color: "#888" },
  fin: { fontWeight: "bold", color: "#047857" },
  live: { fontWeight: "bold", color: "#b45309" },
});

function fmtDateTime(d: Date | null) {
  if (!d) return "Por definir";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FixtureDocument({ data }: { data: FixtureData }) {
  const jornadas = [...new Set(data.rows.map((r) => r.jornada ?? 0))].sort((a, b) => a - b);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Fixture</Text>
        <Text style={styles.subtitle}>
          {data.tournament} · {data.category} · {data.phase}
        </Text>
        <Text style={styles.meta}>
          {[data.venue && `Sede: ${data.venue}`, `Generado el ${new Date().toLocaleDateString("es-BO")}`].filter(Boolean).join(" · ")}
        </Text>

        {jornadas.map((j) => (
          <View key={j} break={j !== jornadas[0]}>
            <Text style={styles.jornada}>
              {data.rows.some((r) => r.jornada === null) && j === 0 ? "Sin fecha definida" : `Fecha ${j}`}
            </Text>
            <View style={styles.headerRow}>
              <Text style={styles.num}>#</Text>
              <Text style={styles.when}>Fecha / hora</Text>
              <Text style={styles.venue}>Cancha</Text>
              <Text style={styles.team}>Local</Text>
              <Text style={styles.score}>Marcador</Text>
              <Text style={styles.team}>Visita</Text>
              <Text style={styles.group}>Grupo</Text>
              <Text style={styles.state}>Estado</Text>
            </View>
            {data.rows
              .filter((r) => (r.jornada ?? 0) === j)
              .sort((a, b) => a.order - b.order)
              .map((r) => {
                const sc =
                  r.homeScore != null && r.awayScore != null ? (
                    <Text style={r.status === "FINALIZADO" ? styles.fin : r.status === "EN_VIVO" || r.status === "DESCANSO" ? styles.live : styles.vs}>
                      {r.homeScore}-{r.awayScore}
                    </Text>
                  ) : (
                    <Text style={styles.vs}>vs</Text>
                  );
                return (
                  <View key={`${j}-${r.order}`} style={styles.row}>
                    <Text style={styles.num}>{r.order + 1}</Text>
                    <Text style={styles.when}>{fmtDateTime(r.scheduledAt)}</Text>
                    <Text style={styles.venue}>{r.venue || "—"}</Text>
                    <Text style={styles.team}>{r.home}</Text>
                    <View style={styles.score}>{sc}</View>
                    <Text style={styles.team}>{r.away}</Text>
                    <Text style={styles.group}>{r.group ?? "—"}</Text>
                    <Text style={styles.state}>{r.status === "FINALIZADO" ? "Finalizado" : r.status === "EN_VIVO" ? "En vivo" : r.status === "DESCANSO" ? "Descanso" : "Programado"}</Text>
                  </View>
                );
              })}
          </View>
        ))}
      </Page>
    </Document>
  );
}