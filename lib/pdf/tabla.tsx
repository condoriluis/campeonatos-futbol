import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type TablaGroup = {
  name: string;
  rows: {
    position: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalDiff: number;
    points: number;
  }[];
};

export type TablaData = {
  tournament: string;
  category: string;
  phase: string;
  qualifiers: string[];
  groups: TablaGroup[];
};

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 8 },
  title: { fontSize: 15, textAlign: "center", fontWeight: "bold" },
  subtitle: { fontSize: 8, textAlign: "center", color: "#444", marginTop: 4 },
  qual: { marginTop: 8, fontSize: 8, textAlign: "center", color: "#047857" },
  groupTitle: { marginTop: 14, fontSize: 11, fontWeight: "bold" },
  headerRow: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#666", paddingVertical: 4, fontWeight: "bold" },
  row: { flexDirection: "row", paddingVertical: 3, borderBottom: 0.5, borderBottomColor: "#ddd" },
  pos: { width: 18, textAlign: "center" },
  team: { flex: 1 },
  num: { width: 24, textAlign: "center" },
  pts: { width: 28, textAlign: "center", fontWeight: "bold" },
});

export function TablaDocument({ data }: { data: TablaData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Tabla de posiciones</Text>
        <Text style={styles.subtitle}>
          {data.tournament} · {data.category} · {data.phase}
        </Text>
        {data.qualifiers.length > 0 && <Text style={styles.qual}>Clasifican: {data.qualifiers.join(" · ")}</Text>}
        {data.groups.map((g) => (
          <View key={g.name} break={g.name !== data.groups[0].name}>
            <Text style={styles.groupTitle}>Grupo {g.name}</Text>
            <View style={styles.headerRow}>
              <Text style={styles.pos}>#</Text>
              <Text style={styles.team}>Equipo</Text>
              <Text style={styles.num}>PJ</Text>
              <Text style={styles.num}>G</Text>
              <Text style={styles.num}>E</Text>
              <Text style={styles.num}>P</Text>
              <Text style={styles.num}>DG</Text>
              <Text style={styles.pts}>Pts</Text>
            </View>
            {g.rows.map((r) => (
              <View key={r.position} style={styles.row}>
                <Text style={styles.pos}>{r.position}</Text>
                <Text style={styles.team}>{r.team}</Text>
                <Text style={styles.num}>{r.played}</Text>
                <Text style={styles.num}>{r.won}</Text>
                <Text style={styles.num}>{r.drawn}</Text>
                <Text style={styles.num}>{r.lost}</Text>
                <Text style={styles.num}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</Text>
                <Text style={styles.pts}>{r.points}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}