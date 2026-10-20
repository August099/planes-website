import Link from "next/link";
import { accountTypeWhere, ACCOUNT_TYPE_LABEL } from "@/lib/admin-accounts";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserTypeSelect } from "@/components/admin/UserTypeSelect";
import { CourtesyPlanControl } from "@/components/admin/CourtesyPlanControl";
import { getQuotaUsage } from "@/lib/quota";

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<{ q?: string; page?: string; plan?: string }> };

// Usuarios del sitio: tipo de cuenta, plan y cupo (VA-152) y plan de cortesía.
export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const { q = "", page: pageParam, plan: planParam } = await searchParams;
  // VA-173: filtro por tipo de cuenta (desde el resumen del admin).
  const plan = (["base", "pro", "broker", "admin", "cortesia"] as const).find((t) => t === planParam) ?? null;
  const query = q.trim();
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UserWhereInput = {
    ...(plan && accountTypeWhere(plan)),
    ...(query && {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
        passwordHash: true,
        isAdmin: true,
        userType: true,
        userTypeConfirmed: true,
        _count: { select: { aircrafts: true, spareParts: true, accounts: true } },
        Subscription: { select: { source: true, status: true, currentPeriodEnd: true, plan: { select: { name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  // VA-92: planes para "Asignar plan de cortesía" (también inactivos, no archivados). VA-166: Pro o
  // una opción del Broker / Empresa (Base es el de toda cuenta sin plan).
  const subscriptionPlans = await prisma.plan.findMany({
    where: { billingType: "SUBSCRIPTION", archivedAt: null, tier: { in: ["PRO", "BUSINESS"] } },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
  // VA-150: arrepentimientos por usuario (solo informativo: el derecho no se puede negar).
  const userIds = users.map((u) => u.id);
  const withdrawalRows = await prisma.payment.findMany({
    where: { withdrawalRequestedAt: { not: null }, OR: [{ purchase: { userId: { in: userIds } } }, { subscription: { userId: { in: userIds } } }] },
    select: { purchase: { select: { userId: true } }, subscription: { select: { userId: true } } },
  });
  const withdrawalsByUser = new Map<string, number>();
  for (const w of withdrawalRows) {
    const id = w.purchase?.userId ?? w.subscription?.userId;
    if (id) withdrawalsByUser.set(id, (withdrawalsByUser.get(id) ?? 0) + 1);
  }
  const planOptions = subscriptionPlans.map((p) => ({ id: p.id, name: p.isActive ? p.name : `${p.name} (no visible en /plans)` }));
  const now = new Date();
  // VA-152: plan efectivo y cupo usado/total de cada cuenta de la página.
  const usages = new Map(await Promise.all(users.map(async (u) => [u.id, await getQuotaUsage(u.id)] as const)));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageUrl = (n: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (plan) params.set("plan", plan);
    params.set("page", String(n));
    return `/admin/users?${params.toString()}`;
  };
  const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#001F58]">
            <Users className="w-6 h-6 text-red-500" />
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            El tipo de cuenta alimenta el filtro “Publica”; “Fábrica” solo se asigna desde acá.
          </p>
          {plan && (
            <p className="mt-2 text-sm">
              Mostrando: <span className="font-semibold text-[#001F58]">{ACCOUNT_TYPE_LABEL[plan]}</span> ·{" "}
              <Link href="/admin/users" className="font-semibold text-[#001F58] underline">Ver todos</Link>
            </p>
          )}
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action="/admin/users">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o email"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className="rounded-xl bg-[#001F58] px-5 py-2.5 text-sm font-semibold text-white">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3">Ingreso</th>
              <th className="px-4 py-3 text-center">Avisos</th>
              <th className="px-4 py-3" title="Avisos activos / cupo, por tipo (VA-152)">Cupo</th>
              <th className="px-4 py-3 text-center" title="Pagos con pedido de arrepentimiento (VA-150). Solo informativo.">Arrepent.</th>
              <th className="px-4 py-3">Tipo de cuenta</th>
              <th className="px-4 py-3">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No hay usuarios con esa búsqueda.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const method = [u.passwordHash ? "Email" : null, u._count.accounts > 0 ? "Google" : null]
                .filter(Boolean)
                .join(" + ");
              return (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/profile/${u.id}`} className="font-semibold text-[#001F58] hover:underline">
                      {u.name || "Sin nombre"}
                    </Link>
                    {u.isAdmin && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">ADMIN</span>
                    )}
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{dateFmt.format(u.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {method || "—"}
                    {u.passwordHash && !u.emailVerified && (
                      <p className="text-xs text-amber-700">Email sin verificar</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{u._count.aircrafts + u._count.spareParts}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
                    {(() => {
                      const q = usages.get(u.id);
                      if (!q) return "—";
                      const over = (k: "AIRCRAFT" | "SPARE_PART") => q.limits[k] !== null && q.used[k] > q.limits[k]!;
                      const cell = (k: "AIRCRAFT" | "SPARE_PART", label: string) => (
                        <span className={over(k) ? "font-semibold text-amber-700" : ""} title={over(k) ? "Por encima del cupo" : undefined}>
                          {label} {q.used[k]}/{q.limits[k] ?? "∞"}
                        </span>
                      );
                      return (
                        <>
                          <p className="text-xs font-semibold text-[#001F58]">{q.planName}</p>
                          <p className="text-xs">
                            {cell("AIRCRAFT", "Av.")} · {cell("SPARE_PART", "Rep.")}
                          </p>
                        </>
                      );
                    })()}
                  </td>
                  <td className={`px-4 py-3 text-center tabular-nums ${(withdrawalsByUser.get(u.id) ?? 0) >= 2 ? "font-semibold text-red-700" : "text-slate-600"}`}>
                    {withdrawalsByUser.get(u.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <UserTypeSelect userId={u.id} userType={u.userType} confirmed={u.userTypeConfirmed} />
                  </td>
                  <td className="px-4 py-3">
                    {/* VA-174: los admins tienen el Broker completo para siempre (sin cortesía). */}
                    {u.isAdmin ? (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-[#001F58]">Admin</span> · Broker completo
                      </p>
                    ) : (
                    <CourtesyPlanControl
                      userId={u.id}
                      userName={u.name || u.email || "el usuario"}
                      plans={planOptions}
                      subscription={
                        u.Subscription
                          ? {
                              planName: u.Subscription.plan.name,
                              source: u.Subscription.source,
                              active: u.Subscription.status === "ACTIVE" && u.Subscription.currentPeriodEnd > now,
                              until: u.Subscription.currentPeriodEnd.toISOString(),
                            }
                          : null
                      }
                    />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="rounded-lg border bg-white px-3 py-2">
              Anterior
            </Link>
          )}
          <span className="text-slate-600">
            Página {page} de {totalPages} · {total} usuarios
          </span>
          {page < totalPages && (
            <Link href={pageUrl(page + 1)} className="rounded-lg border bg-white px-3 py-2">
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
