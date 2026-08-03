"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Send, Reply } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { createQuestionAction, answerQuestionAction } from "@/app/actions/questions";

export interface QuestionData {
  id: string;
  question: string;
  answer?: string | null;
  createdAt: Date | string;
  user?: { name: string | null } | null;
}

interface QnaSectionProps {
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART";
  questions: QuestionData[];
  sellerName?: string;
  sellerId: string;           
  currentUserId?: string;  
}

export function QnaSection({
  entityId,
  entityType,
  questions = [],
  sellerName = "El vendedor",
  sellerId,
  currentUserId,
}: QnaSectionProps) {
  const [newQuestion, setNewQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const pathname = usePathname();


  const isSeller = Boolean(currentUserId && currentUserId === sellerId);


  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createQuestionAction({
        entityId,
        entityType,
        questionText: newQuestion,
        path: pathname,
      });
      setNewQuestion("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al enviar la pregunta");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAnswerSubmit = async (questionId: string) => {
    if (!answerText.trim()) return;

    setIsAnswering(true);
    try {
      await answerQuestionAction({
        questionId,
        answerText,
        path: pathname,
      });
      setReplyingToId(null);
      setAnswerText("");
    } catch (err: any) {
      alert(err.message || "Error al responder");
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <section className="w-full mt-10 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Preguntas y Respuestas</h2>
      </div>

      {!isSeller ? (
        <form onSubmit={handleSubmitQuestion} className="mb-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Hazle una pregunta al vendedor
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: ¿Aceptas permutas? ¿Tiene el historial de mantenimiento al día?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newQuestion.trim()}
              className="flex items-center gap-2 bg-primary text-white font-medium px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm cursor-pointer"
            >
              {isSubmitting ? "Enviando..." : "Preguntar"}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
        </form>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Modo Vendedor:</strong> Estás viendo esta publicación como el dueño. Puedes responder a las preguntas realizadas por los interesados abajo.
        </div>
      )}

      <Separator className="my-6" />


      <div className="flex flex-col gap-6">
        <h3 className="text-lg font-semibold">Últimas preguntas realizadas</h3>

        {questions.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            Aún no se han hecho preguntas sobre esta publicación.
          </p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2 text-sm">
              <div className="flex items-start justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                  {q.user?.name && (
                    <span className="text-xs font-semibold text-gray-500 block mb-1">
                      {q.user.name}
                    </span>
                  )}
                  <p className="text-gray-800 font-medium">{q.question}</p>
                </div>
                <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                  {new Date(q.createdAt).toLocaleDateString("es-AR")}
                </span>
              </div>


              {q.answer ? (
                <div className="ml-6 pl-4 border-l-2 border-primary/40 text-gray-600">
                  <p className="text-xs font-semibold text-primary mb-1">
                    {sellerName} respondió:
                  </p>
                  <p>{q.answer}</p>
                </div>
              ) : (
  
                <div className="ml-6">
                  {isSeller ? (
                    replyingToId === q.id ? (

                      <div className="flex flex-col gap-2 mt-2">
                        <textarea
                          placeholder="Escribe tu respuesta aquí..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setAnswerText("");
                            }}
                            className="px-3 py-1 text-xs border rounded-md text-gray-600 hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isAnswering || !answerText.trim()}
                            onClick={() => handleAnswerSubmit(q.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                          >
                            <Reply className="w-3 h-3" />
                            {isAnswering ? "Respondiendo..." : "Responder"}
                          </button>
                        </div>
                      </div>
                    ) : (

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(q.id);
                          setAnswerText("");
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Reply className="w-3 h-3" /> Responder esta pregunta
                      </button>
                    )
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Aún sin respuesta...
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}