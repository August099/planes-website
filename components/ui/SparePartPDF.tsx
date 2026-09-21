// components/pdf/SparePartPDF.tsx
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: 2,
    borderBottomColor: "#000000",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: { fontSize: 16, fontWeight: 700, textTransform: "uppercase" },
  brandSubtitle: { fontSize: 9, color: "#64748b", marginTop: 2 },
  headerMeta: { textAlign: "right", fontSize: 9 },
  headerMetaBold: { fontWeight: 700 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: 900, maxWidth: "70%" },
  price: { fontSize: 18, fontWeight: 900 },
  image: {
    width: "100%",
    height: 260,
    objectFit: "contain",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
  },
  columns: {
    flexDirection: "row",
    gap: 24,
    borderTop: 1,
    borderTopColor: "#cbd5e1",
    borderBottom: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 14,
  },
  column: { flex: 1 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { fontWeight: 700, marginRight: 4 },
  descriptionBlock: { marginTop: 12 },
  descriptionText: { fontSize: 9, lineHeight: 1.4, color: "#334155" },
  footer: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
});

type SparePartPDFProps = {
  sparePart: {
    id: string;
    title: string;
    partNumber: string | null;
    stock: number;
    description: string | null;
    city: string;
    province: string;
    createdAt: Date;
    inPesos: boolean;
    attributes: Record<string, any>;
    category: { name: string; parent: { name: string } | null } | null;
    images: { url: string }[];
  };
  seller: {
    name: string | null;
    phone: string | null;
    email: string;
    city: string | null;
    province: string | null;
  };
  formattedPrice: string;
};

export function SparePartPDF({ sparePart, seller, formattedPrice }: SparePartPDFProps) {
  const locationText = `${sparePart.city}, ${sparePart.province}`;
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");
  const attributeEntries = Object.entries(sparePart.attributes ?? {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Ventas Aeronáuticas</Text>
            <Text style={styles.brandSubtitle}>Ficha Técnica de Repuesto</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaBold}>
              Publicado el {sparePart.createdAt.toLocaleDateString("es-AR")}
            </Text>
            <Text style={{ color: "#64748b" }}>
              ID Ref: {sparePart.id.slice(-6).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Título + precio */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{sparePart.title}</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Imagen principal */}
        {sparePart.images[0] && (
          <Image src={sparePart.images[0].url} style={styles.image} />
        )}

        {/* Dos columnas: Repuesto / Vendedor */}
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Datos del Repuesto</Text>

            {sparePart.category?.parent?.name && (
              <View style={styles.row}>
                <Text style={styles.label}>Categoría:</Text>
                <Text>{sparePart.category.parent.name}</Text>
              </View>
            )}
            {sparePart.category?.name && (
              <View style={styles.row}>
                <Text style={styles.label}>Subcategoría:</Text>
                <Text>{sparePart.category.name}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Stock:</Text>
              <Text>
                {sparePart.stock} {sparePart.stock === 1 ? "unidad" : "unidades"}
              </Text>
            </View>
            {sparePart.partNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>Número de Parte (P/N):</Text>
                <Text>{sparePart.partNumber}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Ubicación:</Text>
              <Text>{locationText}</Text>
            </View>

            {attributeEntries.map(([key, val]) => (
              <View style={styles.row} key={key}>
                <Text style={styles.label}>{key}:</Text>
                <Text>{String(val)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Datos del Vendedor</Text>

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

            {sparePart.description && (
              <View style={styles.descriptionBlock}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.descriptionText}>{sparePart.description}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          Documento generado desde Ventas Aeronáuticas - Marketplace de Aviones y Repuestos
        </Text>
      </Page>
    </Document>
  );
}