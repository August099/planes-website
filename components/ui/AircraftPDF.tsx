// components/pdf/AircraftPDF.tsx
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: 2,
    borderBottomColor: "#001F58",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: { fontSize: 16, fontWeight: 700, color: "#001F58", textTransform: "uppercase" },
  brandSubtitle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  headerMeta: { textAlign: "right", fontSize: 9 },
  headerMetaBold: { fontWeight: 700, color: "#001F58" },
  titleBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 900, color: "#001F58", maxWidth: "65%" },
  location: { fontSize: 9, color: "#64748b", marginTop: 3 },
  price: { fontSize: 16, fontWeight: 900, color: "#047857" },
  imagesRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  image: { width: "32%", height: 100, objectFit: "cover", borderRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  columns: { flexDirection: "row", gap: 16 },
  column: { flex: 1, gap: 12 },
  box: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 10 },
  boxTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#001F58",
    textTransform: "uppercase",
    borderBottom: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
    marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { fontWeight: 700, color: "#64748b" },
  subBlockTitle: { fontWeight: 700, color: "#001F58", marginTop: 4, marginBottom: 2 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  badge: {
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeFinancing: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1e3a8a" },
  badgeTrade: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" },
  badgeRent: { backgroundColor: "#faf5ff", borderColor: "#e9d5ff", color: "#581c87" },
  descriptionText: { fontSize: 9, lineHeight: 1.4, color: "#334155" },
  footer: { marginTop: 16, textAlign: "center", fontSize: 8, color: "#94a3b8" },
});

type EngineRow = { TBO: string | number; engineHours: number | null; brand: string | null; model: string | null };
type PropellerRow = { propellerHours: number | null; model: string | null };

type AircraftPDFProps = {
  aircraft: {
    id: string;
    title: string;
    year: number;
    totalTimeHours: number | null;
    condition: string;
    engineType: string | null;
    financing: boolean;
    trade: boolean;
    rent: boolean;
    description: string | null;
    city: string;
    province: string;
    createdAt: Date;
    images: { url: string }[];
    engines: EngineRow[];
    propeller: PropellerRow[];
    category: { name: string } | null;
  };
  seller: {
    name: string | null;
    phone: string | null;
    email: string;
    city: string | null;
    province: string | null;
  };
  formattedPrice: string;
  displayBrand: string | null;
  displayModel: string | null;
  displaySubModel: string | null;
};

export function AircraftPDF({
  aircraft,
  seller,
  formattedPrice,
  displayBrand,
  displayModel,
  displaySubModel,
}: AircraftPDFProps) {
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");
  const hasMultipleEngines = aircraft.engines.length > 1;
  const singleEngine = aircraft.engines.length === 1 ? aircraft.engines[0] : null;
  const hasMultiplePropellers = aircraft.propeller.length > 1;
  const singlePropeller = aircraft.propeller.length === 1 ? aircraft.propeller[0] : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Ventas Aeronáuticas</Text>
            <Text style={styles.brandSubtitle}>Ficha Técnica de Publicación</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaBold}>Ref: #{aircraft.id.slice(-6).toUpperCase()}</Text>
            <Text style={{ color: "#64748b" }}>
              Publicado el {aircraft.createdAt.toLocaleDateString("es-AR")}
            </Text>
          </View>
        </View>

        {/* Título + precio + ubicación */}
        <View style={styles.titleBox}>
          <View>
            <Text style={styles.title}>{aircraft.title}</Text>
            <Text style={styles.location}>
              Ubicación: {aircraft.city}, {aircraft.province}
            </Text>
          </View>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Hasta 3 fotos */}
        {aircraft.images.length > 0 && (
          <View style={styles.imagesRow}>
            {aircraft.images.slice(0, 3).map((img, idx) => (
              <Image key={idx} src={img.url} style={styles.image} />
            ))}
          </View>
        )}

        <View style={styles.columns}>
          {/* Columna izquierda: especificaciones + motor/hélice */}
          <View style={styles.column}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Especificaciones Generales</Text>
              {displayBrand && (
                <View style={styles.row}>
                  <Text style={styles.label}>Marca:</Text>
                  <Text>{displayBrand}</Text>
                </View>
              )}
              {displayModel && (
                <View style={styles.row}>
                  <Text style={styles.label}>Modelo:</Text>
                  <Text>{displayModel}</Text>
                </View>
              )}
              {displaySubModel && (
                <View style={styles.row}>
                  <Text style={styles.label}>Variante:</Text>
                  <Text>{displaySubModel}</Text>
                </View>
              )}
              {aircraft.category?.name && (
                <View style={styles.row}>
                  <Text style={styles.label}>Categoría:</Text>
                  <Text>{aircraft.category.name}</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Año:</Text>
                <Text>{aircraft.year}</Text>
              </View>
              {aircraft.totalTimeHours && (
                <View style={styles.row}>
                  <Text style={styles.label}>Horas Totales:</Text>
                  <Text>{aircraft.totalTimeHours} hs</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Condición:</Text>
                <Text>{aircraft.condition}</Text>
              </View>
              {aircraft.engineType && (
                <View style={styles.row}>
                  <Text style={styles.label}>Tipo Motor:</Text>
                  <Text>{aircraft.engineType}</Text>
                </View>
              )}
            </View>

            {/* Motores */}
            {aircraft.engines.length > 0 && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Detalles de Planta Motriz</Text>
                {aircraft.engines.map((e, idx) => (
                  <View key={idx}>
                    {hasMultipleEngines && <Text style={styles.subBlockTitle}>Motor {idx + 1}</Text>}
                    <View style={styles.row}>
                      <Text style={styles.label}>TBO:</Text>
                      <Text>{e.TBO} hs</Text>
                    </View>
                    {e.engineHours && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Horas Usadas:</Text>
                        <Text>{e.engineHours} hs</Text>
                      </View>
                    )}
                    {e.brand && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Marca:</Text>
                        <Text>{e.brand}</Text>
                      </View>
                    )}
                    {e.model && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Modelo:</Text>
                        <Text>{e.model}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Hélices */}
            {aircraft.propeller.length > 0 && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Hélices</Text>
                {aircraft.propeller.map((p, idx) => (
                  <View key={idx}>
                    {hasMultiplePropellers && <Text style={styles.subBlockTitle}>Hélice {idx + 1}</Text>}
                    {p.propellerHours && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Horas Totales:</Text>
                        <Text>{p.propellerHours} hs</Text>
                      </View>
                    )}
                    {p.model && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Modelo:</Text>
                        <Text>{p.model}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Columna derecha: negociación + vendedor + descripción */}
          <View style={styles.column}>
            {(aircraft.financing || aircraft.trade || aircraft.rent) && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Opciones de Negociación</Text>
                <View style={styles.badgesRow}>
                  {aircraft.financing && (
                    <Text style={[styles.badge, styles.badgeFinancing]}>Acepta Financiación</Text>
                  )}
                  {aircraft.trade && <Text style={[styles.badge, styles.badgeTrade]}>Acepta Permuta</Text>}
                  {aircraft.rent && (
                    <Text style={[styles.badge, styles.badgeRent]}>Disponible para Alquiler</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Contacto del Vendedor</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Nombre:</Text>
                <Text>{seller.name}</Text>
              </View>
              {sellerLocation && (
                <View style={styles.row}>
                  <Text style={styles.label}>Ubicación:</Text>
                  <Text>{sellerLocation}</Text>
                </View>
              )}
              {seller.phone && (
                <View style={styles.row}>
                  <Text style={styles.label}>Teléfono:</Text>
                  <Text>{seller.phone}</Text>
                </View>
              )}
              {seller.email && (
                <View style={styles.row}>
                  <Text style={styles.label}>Email:</Text>
                  <Text>{seller.email}</Text>
                </View>
              )}
            </View>

            {aircraft.description && (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>Descripción</Text>
                <Text style={styles.descriptionText}>{aircraft.description}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          Ventas Aeronáuticas — Marketplace de Aviones y Repuestos{"\n"}
          Ver publicación en línea: https://ventasaeronauticas.com/planes/plane-details/{aircraft.id}
        </Text>
      </Page>
    </Document>
  );
}