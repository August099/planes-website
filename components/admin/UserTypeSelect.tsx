"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserType } from "@prisma/client";
import { setUserTypeAction } from "@/app/actions/admin-users-actions";
import { ADMIN_USER_TYPE_OPTIONS } from "@/lib/user-types";

// Tipo de cuenta editable desde /admin/users (VA-33). Guardar desde acá lo marca como confirmado.
export function UserTypeSelect({
  userId,
  userType,
  confirmed,
}: {
  userId: string;
  userType: UserType;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = (value: string) => {
    setError(null);
    startTransition(async () => {
      const res = await setUserTypeAction(userId, value);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <select
        aria-label="Tipo de cuenta"
        defaultValue={userType}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50"
      >
        {ADMIN_USER_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {!confirmed && <p className="text-xs text-amber-700">Sin confirmar</p>}
      {error && <p className="max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  );
}
