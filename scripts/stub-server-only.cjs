// Para correr scripts de verificación con tsx: "server-only" y "next/cache" solo funcionan dentro de
// Next. Uso: npx tsx --require ./scripts/stub-server-only.cjs scripts/<script>.ts
const Module = require("module");
const original = Module._resolveFilename;
const stubs = { "server-only": "./empty-module.cjs", "next/cache": "./next-cache-stub.cjs" };
Module._resolveFilename = function (request, ...rest) {
  if (stubs[request]) return require.resolve(stubs[request]);
  return original.call(this, request, ...rest);
};
