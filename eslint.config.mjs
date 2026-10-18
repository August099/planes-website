import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // VA-114: los .cjs son CommonJS (scripts/stub-server-only.cjs y sus stubs): ahí require() es lo correcto.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // VA-114: builds locales de verificación (NEXT_DIST_DIR, commit 961f3d7).
    ".next-local/**",
    // VA-156: MapLibre copiado al construir (scripts/vendor-maplibre.mjs): código de terceros minificado.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
