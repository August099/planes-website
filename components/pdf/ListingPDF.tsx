import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfSection } from "@/lib/pdf-sections";
import type { PdfSeller } from "@/lib/pdf-assets";

// VA-87 A: PDF de un aviso (aeronave y repuesto; el de hangares, con VA-84, usa este mismo).
// Mismo lenguaje que la web: azul de marca, rótulos en mayúsculas chicas, placas con borde fino.
// El QR va en el pie de la primera página; las demás llevan solo el número de página.

const NAVY = "#00205B";
const RED = "#D62828";
const MUTED = "#64748b";
const LINE = "#d9e0ea";
const QR_SIZE = 71; // 2,5 cm

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 36, paddingBottom: QR_SIZE + 52, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: NAVY, paddingBottom: 8, marginBottom: 14 },
  logo: { height: 22, objectFit: "contain" },
  brandText: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY },
  headerMeta: { textAlign: "right", fontSize: 8, color: MUTED },
  eyebrow: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1.2, textTransform: "uppercase" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, flex: 1 },
  price: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 4 },
  inactive: { marginTop: 6, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#B71F1F" },
  mainPhoto: { width: "100%", height: 250, objectFit: "cover", marginTop: 12, borderRadius: 3 },
  thumbs: { flexDirection: "row", gap: 6, marginTop: 6 },
  thumb: { width: "24%", height: 72, objectFit: "cover", borderRadius: 2 },
  plate: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginTop: 12 },
  plateTitle: { paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  row: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: "#eef1f5" },
  rowLast: { borderBottomWidth: 0 },
  label: { width: "34%", color: MUTED },
  value: { flex: 1, color: "#0f172a" },
  bullet: { flexDirection: "row", gap: 4 },
  description: { paddingHorizontal: 10, paddingVertical: 8, lineHeight: 1.45, color: "#334155" },
  sellerName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  badge: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ffffff", backgroundColor: NAVY, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, textTransform: "uppercase" },
  footer: { position: "absolute", left: 36, right: 36, bottom: 26 },
  qrRow: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10 },
  qr: { width: QR_SIZE, height: QR_SIZE },
  qrText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.35 },
  qrUrl: { fontSize: 8, color: "#0f172a", marginTop: 3 },
  qrNote: { fontSize: 7, color: MUTED, marginTop: 3 },
  pageRule: { borderTopWidth: 1, borderTopColor: LINE },
  pageNumber: { position: "absolute", right: 36, bottom: 12, fontSize: 7.5, color: MUTED },
  slashes: { color: RED },
});

export type ListingPdfProps = {
  logo: string | null;
  kindLabel: string;
  reference: string;
  generatedAt: string;
  title: string;
  price: string;
  publishedAt: string;
  location: string;
  inactive: boolean;
  photos: { main: string | null; thumbs: string[] };
  seller: PdfSeller | null;
  description: string | null;
  sections: PdfSection[];
  qr: { image: string; shortUrl: string };
};

function Plate({ title, children, rows = 0 }: { title: string; children: React.ReactNode; rows?: number }) {
  // Hasta 10 filas la placa va entera a la página siguiente si no entra; más larga, se parte,
  // pero el título nunca queda solo al pie.
  return (
    <View style={s.plate} wrap={rows > 10}>
      <View style={s.plateTitle} wrap={false} minPresenceAhead={40}>
        <Text style={s.eyebrow}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function ListingPDF(p: ListingPdfProps) {
  return (
    <Document title={p.title} author="Ventas Aeronáuticas" subject={p.kindLabel}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          {p.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- el <Image> de @react-pdf/renderer no admite alt
            <Image src={p.logo} style={s.logo} />
          ) : (
            <Text style={s.brandText}>
              VENTAS <Text style={s.slashes}>{"//"}</Text> AERONÁUTICAS
            </Text>
          )}
          <View style={s.headerMeta}>
            <Text style={s.eyebrow}>{p.kindLabel}</Text>
            <Text>
              Ref. #{p.reference} · Generado el {p.generatedAt}
            </Text>
          </View>
        </View>

        <View style={s.titleRow}>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.price}>{p.price}</Text>
        </View>
        <Text style={s.meta}>
          Publicado el {p.publishedAt}
          {p.location ? ` · Ubicación aproximada: ${p.location}` : ""}
        </Text>
        {p.inactive && <Text style={s.inactive}>Este aviso no está disponible al público en este momento.</Text>}

        {p.photos.main && (
          // eslint-disable-next-line jsx-a11y/alt-text -- el <Image> de @react-pdf/renderer no admite alt
          <Image src={p.photos.main} style={s.mainPhoto} />
        )}
        {p.photos.thumbs.length > 0 && (
          <View style={s.thumbs}>
            {p.photos.thumbs.map((t, i) => (
              // eslint-disable-next-line jsx-a11y/alt-text -- el <Image> de @react-pdf/renderer no admite alt
              <Image key={i} src={t} style={s.thumb} />
            ))}
          </View>
        )}

        {p.seller && (
          <View wrap={false}>
            <Plate title="Vendedor">
              <View style={{ paddingHorizontal: 10, paddingTop: 7, paddingBottom: 4 }}>
                <Text style={s.sellerName}>{p.seller.name}</Text>
                <Text style={{ color: MUTED, marginTop: 1 }}>{p.seller.typeLabel}</Text>
                {p.seller.badges.length > 0 && (
                  <View style={s.badges}>
                    {p.seller.badges.map((b) => (
                      <Text key={b} style={s.badge}>
                        {b}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              {[...(p.seller.location ? [{ label: "Ubicación", value: p.seller.location }] : []), ...p.seller.contacts].map((c, i, arr) => (
                <View key={c.label} style={[s.row, i === arr.length - 1 ? s.rowLast : {}]}>
                  <Text style={s.label}>{c.label}</Text>
                  <Text style={s.value}>{c.value}</Text>
                </View>
              ))}
            </Plate>
          </View>
        )}

        {p.description && (
          <Plate title="Descripción">
            <Text style={s.description}>{p.description}</Text>
          </Plate>
        )}

        {p.sections.map((sec) => (
          <Plate key={sec.title} title={sec.title} rows={sec.rows.length}>
            {sec.rows.map((r, i) => (
              <View key={`${r.label}-${i}`} style={[s.row, i === sec.rows.length - 1 ? s.rowLast : {}]} wrap={false}>
                <Text style={s.label}>{r.label}</Text>
                {r.list ? (
                  <View style={s.value}>
                    {r.list.map((item, j) => (
                      <View key={j} style={s.bullet}>
                        <Text>•</Text>
                        <Text>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.value}>{r.value}</Text>
                )}
              </View>
            ))}
          </Plate>
        ))}

        {/* Pie: QR en la primera página (un View no recibe totalPages; los números van en un Text). */}
        <View
          style={s.footer}
          fixed
          render={({ pageNumber }) =>
            pageNumber === 1 ? (
              <View style={s.qrRow}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- el <Image> de @react-pdf/renderer no admite alt */}
                <Image src={p.qr.image} style={s.qr} />
                <View style={{ flex: 1 }}>
                  <Text style={s.qrText}>Escaneá para ver el aviso actualizado, más fotos y contactar al vendedor</Text>
                  <Text style={s.qrUrl}>{p.qr.shortUrl}</Text>
                  <Text style={s.qrNote}>Ventas Aeronáuticas · Ref. #{p.reference}</Text>
                </View>
              </View>
            ) : (
              <View style={s.pageRule} />
            )
          }
        />
        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber > 1 ? `${p.title} · ` : ""}Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
