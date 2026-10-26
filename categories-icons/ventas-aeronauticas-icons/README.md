# Ventas Aeronáuticas — Icon System

Iconos SVG/React monocromáticos, con una grilla común de 24×24, `currentColor`,
trazos redondeados y configuración consistente.

## Iconos
- AvionIcon
- AvionAgricolaIcon
- MotorIcon
- CombustibleIcon
- AceiteraIcon
- HeliceIcon
- GpsIcon
- InstrumentosVueloIcon
- HerramientasIcon
- HeadsetIcon
- RuedaIcon
- FrenosIcon
- LucesElectricosIcon

## Uso

```jsx
import { AvionIcon, MotorIcon, GpsIcon } from "./icons";

export function Example() {
  return (
    <div>
      <AvionIcon size={32} strokeWidth={1.8} />
      <MotorIcon size={32} />
      <GpsIcon size={32} />
    </div>
  );
}
```

Todos utilizan `stroke="currentColor"`, por lo que el color se controla desde CSS/Tailwind.

### API común
- `size`: 24 por defecto
- `strokeWidth`: 1.8 por defecto
- `className`
- `title` para accesibilidad
- props SVG adicionales

## Recomendación de diseño
Mantener una única familia de iconos en toda la plataforma: 24×24, línea monocromática,
sin rellenos decorativos, con `round` linecap/linejoin y suficiente espacio negativo.

- TornilloTuercaIcon
