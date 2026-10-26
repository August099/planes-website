-- VA-148 (socio, 17/10): los íconos de las categorías de repuestos pasan de nombres de react-icons a
-- los 14 íconos propios (components/icons/category). Tabla aprobada por el socio.
UPDATE "Category" SET "icon" = CASE "icon"
  WHEN 'FaHeadset'       THEN 'HeadsetIcon'
  WHEN 'MdRadar'         THEN 'InstrumentosVueloIcon'
  WHEN 'FaPlaneUp'       THEN 'AvionIcon'
  WHEN 'FaTools'         THEN 'HerramientasIcon'
  WHEN 'GiPlantWatering' THEN 'AvionAgricolaIcon'
  WHEN 'FaOilCan'        THEN 'AceiteraIcon'
  WHEN 'TbScrew'         THEN 'TornilloTuercaIcon'
  WHEN 'TbEngine'        THEN 'MotorIcon'
  WHEN 'FaBolt'          THEN 'LucesElectricosIcon'
  WHEN 'GiCarWheel'      THEN 'RuedaIcon'
END
WHERE "icon" IN ('FaHeadset', 'MdRadar', 'FaPlaneUp', 'FaTools', 'GiPlantWatering', 'FaOilCan', 'TbScrew', 'TbEngine', 'FaBolt', 'GiCarWheel');

-- Cualquier otro nombre que no sea uno de los 14 (cargado a mano) queda sin ícono.
UPDATE "Category" SET "icon" = NULL
WHERE "icon" IS NOT NULL AND "icon" NOT IN ('AceiteraIcon', 'AvionIcon', 'AvionAgricolaIcon', 'CombustibleIcon', 'FrenosIcon', 'GpsIcon', 'HeadsetIcon', 'HeliceIcon', 'HerramientasIcon', 'InstrumentosVueloIcon', 'LucesElectricosIcon', 'MotorIcon', 'RuedaIcon', 'TornilloTuercaIcon');
