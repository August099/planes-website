"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  ArrowUpRight, 
  Reply, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { answerQuestionAction } from "@/app/actions/questions";

interface QuestionsClientProps {
  receivedQuestions: any[];
  sentQuestions: any[];
}

export function QuestionsClient({
  receivedQuestions,
  sentQuestions,
}: QuestionsClientProps) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const pathname = usePathname();

  // Calcular conteo de pendientes (sin respuesta) para la solapa de recibidas
  const pendingReceivedCount = receivedQuestions.filter((q) => !q.answer).length;

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
    <div className="space-y-6">
      {/* Título de la página */}
      <div>
        <h1 className="text-2xl font-bold text-[#001F58] flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Mis Consultas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona las preguntas sobre tus publicaciones y el estado de tus consultas enviadas.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("received")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "received"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Preguntas recibidas ({receivedQuestions.length})
          {pendingReceivedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse">
              {pendingReceivedCount} sin responder
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("sent")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "sent"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Mis preguntas realizadas ({sentQuestions.length})
        </button>
      </div>

      {/* Pestaña: Preguntas Recibidas (Como Vendedor) */}
      {activeTab === "received" && (
        <div className="space-y-4">
          {receivedQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
              No has recibido preguntas en tus publicaciones por el momento.
            </div>
          ) : (
            receivedQuestions.map((q) => {
              const item = q.aircraft || q.sparePart;
              const detailsUrl = q.aircraft
                ? `/planes/plane-details/${q.aircraft.id}`
                : `/spareparts/sparepart-details/${q.sparePart.id}`;
              const imageUrl = item?.images?.[0]?.url || "/placeholder.png";
              const isPending = !q.answer;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isPending
                      ? "bg-amber-50/40 border-amber-200 shadow-2xs"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Encabezado del Producto */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <Image src={imageUrl} alt={item?.title || "Producto"} fill className="object-cover" />
                      </div>
                      <span className="text-sm font-bold text-[#001F58] line-clamp-1">
                        {item?.title}
                      </span>
                    </div>

                    <Link
                      href={detailsUrl}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Ver aviso <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Detalle de la Pregunta */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          {q.user?.name || "Usuario interesado"} preguntó:
                        </span>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{q.question}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(q.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>

                    {/* Respuesta / Formulario de Respuesta */}
                    {q.answer ? (
                      <div className="ml-4 pl-3 border-l-2 border-blue-500/40 text-xs space-y-1">
                        <span className="font-semibold text-blue-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tu respuesta:
                        </span>
                        <p className="text-slate-600">{q.answer}</p>
                      </div>
                    ) : (
                      <div className="pt-2">
                        {replyingToId === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Escribe tu respuesta aquí..."
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToId(null);
                                  setAnswerText("");
                                }}
                                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isAnswering || !answerText.trim()}
                                onClick={() => handleAnswerSubmit(q.id)}
                                className="px-4 py-1.5 text-xs font-bold bg-[#001F58] text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Reply className="w-3.5 h-3.5" />
                                {isAnswering ? "Enviando..." : "Responder"}
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5" /> Responder ahora
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pestaña: Preguntas Realizadas (Como Comprador) */}
      {activeTab === "sent" && (
        <div className="space-y-4">
          {sentQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
              Aún no has realizado preguntas en ninguna publicación.
            </div>
          ) : (
            sentQuestions.map((q) => {
              const item = q.aircraft || q.sparePart;
              const detailsUrl = q.aircraft
                ? `/planes/plane-details/${q.aircraft.id}`
                : `/spareparts/sparepart-details/${q.sparePart.id}`;
              const imageUrl = item?.images?.[0]?.url || "/placeholder.png";

              return (
                <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                  {/* Encabezado del Producto */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <Image src={imageUrl} alt={item?.title || "Producto"} fill className="object-cover" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#001F58] line-clamp-1">
                          {item?.title}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Vendedor: {item?.seller?.name || "El vendedor"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={detailsUrl}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Ver aviso <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Pregunta enviada y respuesta recibida */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm text-slate-800 font-medium">
                        <span className="text-slate-400 mr-1.5 font-normal">Tú:</span>
                        {q.question}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(q.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>

                    {q.answer ? (
                      <div className="ml-4 pl-3 border-l-2 border-emerald-500 text-xs space-y-1 bg-emerald-50/40 p-2.5 rounded-r-xl">
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Respuesta del vendedor:
                        </span>
                        <p className="text-slate-700">{q.answer}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-amber-600 italic font-medium pt-1">
                        <Clock className="w-3.5 h-3.5" /> Esperando respuesta del vendedor...
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}