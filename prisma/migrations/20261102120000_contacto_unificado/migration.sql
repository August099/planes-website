-- 2/11: el contacto es uno solo (phone + email). Quien cargó solo el WhatsApp de la página lo conserva como teléfono.
UPDATE "User" SET "phone" = '+' || "whatsapp"
WHERE ("phone" IS NULL OR btrim("phone") = '') AND "whatsapp" IS NOT NULL AND btrim("whatsapp") <> '';
