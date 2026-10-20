"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getAccountCounts, getExpensesSummary, type AccountCounts, type ExpensesSummary } from "@/lib/admin-accounts";

// VA-173: cuentas por tipo y gastos fijos (referencia: no factura ni paga nada).

async function requireAdmin() {
  const u = await getCurrentUser();
  return u?.isAdmin ? u : null;
}

export async function getAdminSummaryAction(): Promise<{ accounts: AccountCounts; expenses: Omit<ExpensesSummary, "rate"> & { rate: { usdToArs: number; date: string } | null } } | null> {
  if (!(await requireAdmin())) return null;
  const [accounts, expenses] = await Promise.all([getAccountCounts(), getExpensesSummary()]);
  return { accounts, expenses: { ...expenses, rate: expenses.rate ? { usdToArs: expenses.rate.usdToArs, date: expenses.rate.date.toISOString() } : null } };
}

const expenseSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Poné un nombre.").max(80, "Hasta 80 caracteres."),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0.").max(1_000_000_000, "Monto demasiado alto."),
  currency: z.enum(["ARS", "USD"]),
  frequency: z.enum(["MONTHLY", "YEARLY"]),
  since: z.iso.date("Elegí desde cuándo."),
  notes: z.string().trim().max(300, "Hasta 300 caracteres.").optional().default(""),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
type Result = { ok: true } | { ok: false; error: string };

export async function saveExpenseAction(input: ExpenseInput): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const { id, since, notes, ...rest } = parsed.data;
  const data = { ...rest, since: new Date(`${since}T00:00:00-03:00`), notes: notes || null };
  if (id) await prisma.fixedExpense.update({ where: { id }, data });
  else await prisma.fixedExpense.create({ data });
  revalidatePath("/admin/expenses");
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "No autorizado." };
  // Es una lista de referencia (no son datos de pagos): se puede borrar.
  await prisma.fixedExpense.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/expenses");
  return { ok: true };
}

export async function addExchangeRateAction(input: { usdToArs: unknown; date: unknown }): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };
  const parsed = z.object({ usdToArs: z.coerce.number().positive("Cargá el valor del dólar.").max(1_000_000), date: z.iso.date("Elegí la fecha.") }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  await prisma.exchangeRate.create({ data: { usdToArs: parsed.data.usdToArs, date: new Date(`${parsed.data.date}T00:00:00-03:00`), createdById: admin.id } });
  revalidatePath("/admin/expenses");
  return { ok: true };
}
