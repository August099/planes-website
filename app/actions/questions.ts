"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
    throw new Error("Debes iniciar sesión.");
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      aircraft: { select: { sellerId: true } },
      sparePart: { select: { sellerId: true } },
    },
  });

  if (!question) {
    throw new Error("La pregunta no existe.");
  }

  const sellerId = question.aircraft?.sellerId || question.sparePart?.sellerId;

  if (sellerId !== session.user.id) {
    throw new Error("No tienes permiso para responder esta pregunta.");
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: {
      answer: answerText,
    },
  });

  revalidatePath(path);

  return { success: true, data: updatedQuestion };
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
    throw new Error("Debes iniciar sesión para hacer una pregunta.");
  }

  const newQuestion = await prisma.question.create({
    data: {
      userId: session.user.id,
      question: questionText,
      aircraftId: entityType === "AIRCRAFT" ? entityId : null,
      sparePartId: entityType === "SPARE_PART" ? entityId : null,
    },
  });

  revalidatePath(path);

  return { success: true, data: newQuestion };
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