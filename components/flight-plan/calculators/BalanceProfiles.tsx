"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { AircraftBalance } from "@/lib/aero/fpl";
import { saveAircraftBalanceAction } from "@/app/actions/flight-plan-actions";
import type { ProfileBalanceSummary } from "@/app/api/flight-plan/profiles/route";

// VA-191: peso y balance guardado con cada aeronave. La calculadora sigue funcionando sin cuenta.
export function BalanceProfiles({ current, onLoad }: { current: AircraftBalance; onLoad: (balance: AircraftBalance) => void }) {
  const [profiles, setProfiles] = useState<ProfileBalanceSummary[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = () =>
    fetch("/api/flight-plan/profiles")
      .then((r) => {
        if (r.status === 401) setSignedOut(true);
        return r.ok ? (r.json() as Promise<ProfileBalanceSummary[]>) : null;
      })
      .then((list) => {
        if (list) setProfiles(list);
      })
      .catch(() => {});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flight-plan/profiles")
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) setSignedOut(true);
        return r.ok ? (r.json() as Promise<ProfileBalanceSummary[]>) : null;
      })
      .then((list) => {
        if (!cancelled && list) setProfiles(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (signedOut) {
    return (
      <p className="text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
          Ingresá a tu cuenta
        </Link>{" "}
        para guardar estos datos con tu aeronave.
      </p>
    );
  }
  if (!profiles) return null;

  const choose = (id: string) => {
    setSelected(id);
    setNotice(null);
    const balance = profiles.find((p) => p.id === id)?.balance;
    if (balance) onLoad(balance);
  };

  const save = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await saveAircraftBalanceAction(selected ? { id: selected, balance: current } : { name, balance: current });
      setNotice(result.ok ? "Datos guardados en la aeronave." : result.error);
      if (result.ok) {
        setSelected(result.id);
        setName("");
        await reload();
      }
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-[#00205B]/12 bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Tu aeronave</span>
        <select value={selected} onChange={(e) => choose(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-[#00205B]">
          <option value="">Una aeronave nueva</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.balance ? "" : " (sin datos de balance)"}
            </option>
          ))}
        </select>
      </label>
      {!selected && (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Nombre o matrícula</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="LV-ABC" autoComplete="off" className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-[#00205B] placeholder:text-slate-400" />
        </label>
      )}
      <button type="button" onClick={save} disabled={pending || (!selected && !name.trim())} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00205B]/25 bg-white px-4 text-sm font-bold text-[#00205B] hover:bg-slate-50 disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar estos datos"}
      </button>
      {notice && (
        <p role="status" className="text-sm text-[#00205B]">
          {notice}
        </p>
      )}
    </div>
  );
}
