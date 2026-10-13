"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath, updateTag } from "next/cache";
import { unansweredQuestionsTag } from "@/lib/cached-data";

const MAX_TEXT_LENGTH = 1000;

// Solo rutas internas del sitio (el path lo manda el cliente).
function safeRevalidate(path: string) {
  if (typeof path === "string" && /^\/(?![/\\])/.test(path)) revalidatePath(path);
}

interface AnswerQuestionInput {
  questionId: string;
  answerText: string;
  path: string;
}

export async function answerQuestionAction({
  questionId,
  answerText,
  path,
}: AnswerQuestionInput) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Tenés que iniciar sesión." };
  }

  const answer = String(answerText ?? "").trim();
  if (!answer) {
    return { success: false, error: "La respuesta no puede estar vacía." };
  }
  if (answer.length > MAX_TEXT_LENGTH) {
    return { success: false, error: `La respuesta no puede superar los ${MAX_TEXT_LENGTH} caracteres.` };
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      aircraft: { select: { sellerId: true } },
      sparePart: { select: { sellerId: true } },
    },
  });

  if (!question) {
    return { success: false, error: "La pregunta no existe." };
  }

  const sellerId = question.aircraft?.sellerId || question.sparePart?.sellerId;

  if (sellerId !== session.user.id) {
    return { success: false, error: "No tenés permiso para responder esta pregunta." };
  }

  await prisma.question.update({
    where: { id: questionId },
    data: {
      answer,
      answeredAt: new Date(),
    },
  });

  updateTag(unansweredQuestionsTag(sellerId));
  safeRevalidate(path);

  return { success: true };
}


interface CreateQuestionInput {
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART";
  questionText: string;
  path: string;
}

export async function createQuestionAction({
  entityId,
  entityType,
  questionText,
  path,
}: CreateQuestionInput) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Tenés que iniciar sesión para hacer una pregunta." };
  }

  const text = String(questionText ?? "").trim();
  if (!text) {
    return { success: false, error: "La pregunta no puede estar vacía." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { success: false, error: `La pregunta no puede superar los ${MAX_TEXT_LENGTH} caracteres.` };
  }
  if (entityType !== "AIRCRAFT" && entityType !== "SPARE_PART") {
    return { success: false, error: "Publicación inválida." };
  }

  const listing =
    entityType === "AIRCRAFT"
      ? await prisma.aircraft.findUnique({ where: { id: entityId }, select: { sellerId: true } })
      : await prisma.sparePart.findUnique({ where: { id: entityId }, select: { sellerId: true } });

  if (!listing) {
    return { success: false, error: "La publicación no existe." };
  }
  if (listing.sellerId === session.user.id) {
    return { success: false, error: "No podés hacer preguntas en tu propia publicación." };
  }

  await prisma.question.create({
    data: {
      userId: session.user.id,
      question: text,
      aircraftId: entityType === "AIRCRAFT" ? entityId : null,
      sparePartId: entityType === "SPARE_PART" ? entityId : null,
    },
  });

  updateTag(unansweredQuestionsTag(listing.sellerId));
  safeRevalidate(path);

  return { success: true };
}

export async function getUserQuestionsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const userId = session.user.id;

  // 1. Preguntas que le hicieron al usuario (como vendedor)
  const receivedQuestions = await prisma.question.findMany({
    where: {
      OR: [
        { aircraft: { sellerId: userId } },
        { sparePart: { sellerId: userId } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      aircraft: { select: { id: true, title: true, images: { take: 1 } } },
      sparePart: { select: { id: true, title: true, images: { take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Preguntas que hizo el usuario (como comprador)
  const sentQuestions = await prisma.question.findMany({
    where: { userId },
    include: {
      aircraft: {
        select: {
          id: true,
          title: true,
          seller: { select: { name: true } },
          images: { take: 1 },
        },
      },
      sparePart: {
        select: {
          id: true,
          title: true,
          seller: { select: { name: true } },
          images: { take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    receivedQuestions,
    sentQuestions,
  };
}