import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FplItems } from "@/lib/aero/fpl";
import type { Leg } from "@/lib/aero/route";

// VA-191: formulario OACI y hoja de navegación. Sin fotos ni QR: se imprime y se presenta.
const NAVY = "#00205B";
const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: NAVY, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 8, color: "#475569", marginTop: 2, marginBottom: 10 },
  row: { flexDirection: "row", gap: 4, marginBottom: 4 },
  box: { borderWidth: 0.75, borderColor: NAVY, padding: 4, flexGrow: 1, flexBasis: 0, minHeight: 28 },
  label: { fontSize: 6.5, color: "#475569", marginBottom: 2 },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  mono: { fontSize: 9, fontFamily: "Courier" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  td: { fontSize: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#94A3B8", paddingVertical: 2.5 },
  warn: { borderLeftWidth: 2, borderLeftColor: "#D62828", paddingLeft: 5, marginBottom: 3, fontSize: 9 },
  legal: { position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 6.5, color: "#475569" },
});

const Box = ({ label, value, grow = 1, mono = false }: { label: string; value: string; grow?: number; mono?: boolean }) => (
  <View style={[s.box, { flexGrow: grow }]}>
    <Text style={s.label}>{label}</Text>
    <Text style={mono ? s.mono : s.value}>{value || " "}</Text>
  </View>
);

const LEGAL = "Herramienta orientativa. No reemplaza el AIP, los NOTAM ni la información meteorológica oficial, ni la planificación del piloto. Tampoco reemplaza la información obtenida previa al vuelo en la oficina ARO-AIS del aeródromo de partida. Hecho con ventasaeronauticas.com";

export type StationWeather = { station: string; label: string; metar: string | null; taf: string | null };

export type FlightPlanPdfProps = {
  items: FplItems;
  message: string;
  localDeparture: string;
  legs: Leg[];
  totals: { distanceNm: number; time: string | null };
  fuel: string[];
  warnings: string[];
  weather: StationWeather[];
  generatedAt: string;
};

const heading = (n: number | null) => (n === null ? "—" : String(Math.round(n) % 360).padStart(3, "0"));
const duration = (hours: number | null) => {
  if (hours === null) return "—";
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const COLS = [{ t: "Tramo", w: 3.6 }, { t: "NM", w: 0.8 }, { t: "Rumbo V", w: 0.9 }, { t: "Rumbo M", w: 0.9 }, { t: "Viento", w: 1.1 }, { t: "Proa M", w: 0.9 }, { t: "GS", w: 0.7 }, { t: "Tiempo", w: 0.8 }];

export function FlightPlanPDF({ items: i, message, localDeparture, legs, totals, fuel, warnings, weather, generatedAt }: FlightPlanPdfProps) {
  return (
    <Document title={`Plan de vuelo ${i.item7}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Plan de vuelo</Text>
        <Text style={s.sub}>Formulario OACI, casillas 7 a 19. Horas en UTC. Salida en hora argentina: {localDeparture || "sin cargar"}. Generado: {generatedAt}.</Text>
        <View style={s.row}>
          <Box label="7 IDENTIFICACIÓN" value={i.item7} grow={2} />
          <Box label="8 REGLAS" value={i.item8Rules} />
          <Box label="TIPO DE VUELO" value={i.item8Type} />
        </View>
        <View style={s.row}>
          <Box label="9 TIPO DE AERONAVE" value={i.item9Type} />
          <Box label="ESTELA" value={i.item9Wake} />
          <Box label="10 EQUIPO" value={i.item10a} grow={2} />
          <Box label="VIGILANCIA" value={i.item10b} />
        </View>
        <View style={s.row}>
          <Box label="13 AERÓDROMO DE SALIDA" value={i.item13Dep} />
          <Box label="HORA UTC" value={i.item13Time} />
        </View>
        <View style={s.row}>
          <Box label="15 VELOCIDAD" value={i.item15Speed} />
          <Box label="NIVEL" value={i.item15Level} />
        </View>
        <View style={s.row}>
          <Box label="RUTA" value={i.item15Route} mono />
        </View>
        <View style={s.row}>
          <Box label="16 AERÓDROMO DE DESTINO" value={i.item16Dest} />
          <Box label="DURACIÓN TOTAL" value={i.item16Eet} />
          <Box label="ALTERNATIVA" value={i.item16Altn} />
        </View>
        <View style={s.row}>
          <Box label="18 OTROS DATOS" value={i.item18} mono />
        </View>
        <View style={s.row}>
          <Box label="19 AUTONOMÍA E/" value={i.item19.endurance} />
          <Box label="PERSONAS P/" value={i.item19.persons} />
          <Box label="RADIO R/" value={i.item19.radios} />
          <Box label="SUPERVIVENCIA S/" value={i.item19.survival} />
          <Box label="CHALECOS J/" value={i.item19.jackets} />
        </View>
        <View style={s.row}>
          <Box label="COLOR Y MARCAS A/" value={i.item19.color} grow={2} />
          <Box label="OBSERVACIONES N/" value={i.item19.remarks} grow={2} />
        </View>
        <View style={s.row}>
          <Box label="PILOTO AL MANDO C/" value={i.item19.pilot} />
          <Box label="FIRMA" value="" />
        </View>
        <Text style={s.h2}>Mensaje FPL</Text>
        <Text style={s.mono}>{message}</Text>
        <Text style={s.legal} fixed>{LEGAL}</Text>
      </Page>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Briefing</Text>
        <Text style={s.sub}>Generado: {generatedAt}. El clima es el de ese momento: volvé a consultarlo antes de salir.</Text>
        {warnings.map((w) => (
          <Text key={w} style={s.warn}>{w}</Text>
        ))}
        <Text style={s.h2}>Tramos</Text>
        <View style={s.tr}>
          {COLS.map((c) => (
            <Text key={c.t} style={[s.th, { flex: c.w }]}>{c.t}</Text>
          ))}
        </View>
        {legs.map((l, n) => {
          const cells = [`${l.from.icao ?? l.from.name} a ${l.to.icao ?? l.to.name}`, l.distanceNm.toFixed(0), heading(l.trueCourse), heading(l.magneticCourse), l.wind.dir !== null ? `${heading(l.wind.dir)}/${l.wind.speed}` : "sin cargar", heading(l.magneticHeading), l.groundSpeed !== null ? l.groundSpeed.toFixed(0) : "—", duration(l.hours)];
          return (
            <View key={n} style={s.tr} wrap={false}>
              {cells.map((text, c) => (
                <Text key={c} style={[s.td, { flex: COLS[c].w }]}>{text}</Text>
              ))}
            </View>
          );
        })}
        <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>Total: {totals.distanceNm.toFixed(0)} NM{totals.time ? ` · ${totals.time}` : ""}</Text>
        {fuel.length > 0 && (
          <>
            <Text style={s.h2}>Combustible</Text>
            {fuel.map((f) => (
              <Text key={f}>{f}</Text>
            ))}
          </>
        )}
        <Text style={s.h2}>Clima</Text>
        {weather.map((w) => (
          <View key={w.station} style={{ marginBottom: 6 }} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{w.label}: {w.station}</Text>
            <Text style={s.mono}>{w.metar ?? "No hay datos recientes para esta estación"}</Text>
            {w.taf && <Text style={[s.mono, { marginTop: 2 }]}>{w.taf}</Text>}
          </View>
        ))}
        {weather.length === 0 && <Text>Ningún aeródromo de la ruta reporta METAR.</Text>}
        <Text style={s.h2}>NOTAM</Text>
        <Text>Consultá los NOTAM oficiales: ais.anac.gob.ar/notam</Text>
        <Text style={s.legal} fixed>{LEGAL}</Text>
      </Page>
    </Document>
  );
}
