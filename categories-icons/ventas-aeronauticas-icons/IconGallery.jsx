import {
  AvionIcon, AvionAgricolaIcon, MotorIcon, CombustibleIcon,
  AceiteraIcon, HeliceIcon, GpsIcon, InstrumentosVueloIcon,
  HerramientasIcon, HeadsetIcon, RuedaIcon, FrenosIcon,
  LucesElectricosIcon
} from "./icons";

const icons = [
  ["Avión", AvionIcon],
  ["Avión agrícola", AvionAgricolaIcon],
  ["Motor", MotorIcon],
  ["Combustible", CombustibleIcon],
  ["Aceitera", AceiteraIcon],
  ["Hélice", HeliceIcon],
  ["GPS", GpsIcon],
  ["Instrumentos", InstrumentosVueloIcon],
  ["Herramientas", HerramientasIcon],
  ["Headsets", HeadsetIcon],
  ["Ruedas", RuedaIcon],
  ["Frenos", FrenosIcon],
  ["Luces / eléctricos", LucesElectricosIcon],
];

export default function IconGallery() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-7">
      {icons.map(([label, Icon]) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <Icon size={40} strokeWidth={1.8} title={label} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
