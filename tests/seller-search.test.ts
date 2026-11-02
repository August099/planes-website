// 3/11: búsqueda de vendedores sin distinguir acentos ni mayúsculas.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSellers, sellerMatchRank } from "../lib/seller-search";

const seller = (name: string | null, businessName: string | null = null) => ({ name, businessName });

test("ignora acentos y mayúsculas, en los dos sentidos", () => {
  assert.equal(sellerMatchRank(seller("Agustín Pérez"), "agustin"), 0);
  assert.equal(sellerMatchRank(seller("Agustin Perez"), "AGUSTÍN"), 0);
});

test("busca en el nombre y en el nombre comercial", () => {
  assert.notEqual(sellerMatchRank(seller("Juan", "Aero Agustín"), "agustin"), null);
  assert.notEqual(sellerMatchRank(seller("Agustín", "Hangar Sur"), "agustin"), null);
  assert.equal(sellerMatchRank(seller("Juan", "Hangar Sur"), "agustin"), null);
  assert.equal(sellerMatchRank(seller(null, null), "agustin"), null);
});

test("varias palabras tienen que estar todas, en cualquier orden", () => {
  assert.notEqual(sellerMatchRank(seller("Agustín Pérez"), "perez agustin"), null);
  assert.equal(sellerMatchRank(seller("Agustín Gómez"), "perez agustin"), null);
});

test("primero los más parecidos, y respeta el límite", () => {
  const list = [seller("Sagustin"), seller("Juan Agustín"), seller("Agustín")];
  assert.deepEqual(rankSellers(list, "agustin", 2).map((s) => s.name), ["Agustín", "Juan Agustín"]);
});
