"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { ReportStatus } from "@prisma/client";

export async function updateReportStatusAction(
  reportId: string,
  newStatus: ReportStatus
) {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    throw new Error("No tienes permisos de administrador.");
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: newStatus },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}