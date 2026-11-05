"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { flightPlanEnabled, FLIGHT_PLAN_PATH } from "@/lib/flight-plan-flag";
import { flightPlanQuota } from "@/lib/flight-plan-quota";
import { aircraftSchema, planSchema } from "@/lib/aero/plan-schema";
import { localToUtc } from "@/lib/aero/fpl";
import { Prisma } from "@prisma/client";

// VA-191: guardado de planes y perfiles de aeronave. El cupo suma los dos; editar lo ya guardado no consume cupo.
export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const LIMIT_MESSAGE = "Llegaste al límite de tu plan. Borrá algo guardado o mirá los planes con más lugar.";

async function currentUserId() {
  if (!flightPlanEnabled()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

async function hasRoom(userId: string) {
  const { limit, used } = await flightPlanQuota(userId);
  return limit === null || used < limit;
}

const cleanName = (name: unknown, fallback: string) => (typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : fallback);

export async function saveFlightPlanAction(input: { id?: string; name: string; draft: unknown }): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Ingresá a tu cuenta para guardar." };
  const parsed = planSchema.safeParse(input.draft);
  if (!parsed.success) return { ok: false, error: "No se pudo leer el plan. Revisá los datos." };
  const draft = parsed.data;
  const fields = {
    name: cleanName(input.name, "Plan de vuelo"),
    origin: draft.route.origin?.icao ?? draft.route.origin?.name ?? null,
    destination: draft.route.destination?.icao ?? draft.route.destination?.name ?? null,
    departureAt: localToUtc(draft.flight.date, draft.flight.time),
    data: draft as unknown as Prisma.InputJsonValue,
  };
  if (input.id) {
    const updated = await prisma.flightPlan.updateMany({ where: { id: input.id, userId }, data: fields });
    if (!updated.count) return { ok: false, error: "Ese plan ya no existe." };
    revalidatePath(FLIGHT_PLAN_PATH);
    return { ok: true, id: input.id };
  }
  if (!(await hasRoom(userId))) return { ok: false, error: LIMIT_MESSAGE };
  const created = await prisma.flightPlan.create({ data: { ...fields, userId }, select: { id: true } });
  revalidatePath(FLIGHT_PLAN_PATH);
  return { ok: true, id: created.id };
}

export async function deleteFlightPlanAction(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await prisma.flightPlan.deleteMany({ where: { id, userId } });
  revalidatePath(FLIGHT_PLAN_PATH);
}

export async function saveAircraftProfileAction(input: { id?: string; name: string; aircraft: unknown }): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "Ingresá a tu cuenta para guardar." };
  const parsed = aircraftSchema.safeParse(input.aircraft);
  if (!parsed.success) return { ok: false, error: "No se pudo leer la aeronave. Revisá los datos." };
  const fields = { name: cleanName(input.name, parsed.data.registration || "Aeronave"), data: parsed.data as unknown as Prisma.InputJsonValue };
  if (input.id) {
    const updated = await prisma.aircraftProfile.updateMany({ where: { id: input.id, userId }, data: fields });
    if (!updated.count) return { ok: false, error: "Esa aeronave ya no existe." };
    revalidatePath(FLIGHT_PLAN_PATH);
    return { ok: true, id: input.id };
  }
  if (!(await hasRoom(userId))) return { ok: false, error: LIMIT_MESSAGE };
  const created = await prisma.aircraftProfile.create({ data: { ...fields, userId }, select: { id: true } });
  revalidatePath(FLIGHT_PLAN_PATH);
  return { ok: true, id: created.id };
}

export async function deleteAircraftProfileAction(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await prisma.aircraftProfile.deleteMany({ where: { id, userId } });
  revalidatePath(FLIGHT_PLAN_PATH);
}
