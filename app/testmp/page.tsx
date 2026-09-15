"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestMercadoPagoPage() {
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string>("Esperando clic...");

  const handleTestPayment = async () => {
    console.log("--> BOTÓN PRESIONADO");
    setDebugLog("Botón presionado. Enviando petición a /api/test-preference...");
    setLoading(true);

    try {
      const response = await fetch("/api/test-preference", {
        method: "POST",
      });

      console.log("Respuesta Status:", response.status);
      const data = await response.json();
      console.log("Respuesta Data:", data);

      if (!response.ok) {
        setDebugLog(`Error HTTP ${response.status}: ${JSON.stringify(data)}`);
        return;
      }

      if (data.init_point) {
        setDebugLog("¡Éxito! Redirigiendo a Mercado Pago...");
        window.location.href = data.init_point;
      } else {
        setDebugLog(`No se recibió init_point. Respuesta: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error("Error capturado:", error);
      setDebugLog(`Error de Red/JS: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-md w-full space-y-4">
        <h1 className="text-xl font-bold text-[#001F58]">
          Prueba de Webhook Mercado Pago
        </h1>
        <p className="text-sm text-slate-600">
          Haz clic en el botón para simular la compra.
        </p>

        <Button
          onClick={handleTestPayment}
          disabled={loading}
          className="w-full bg-[#009EE3] hover:bg-[#0081B8] text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
        >
          {loading ? "Generando preferencia..." : "Probar Pago Mercado Pago"}
        </Button>

        {/* Caja de diagnóstico en pantalla */}
        <div className="mt-4 p-3 bg-slate-100 rounded-lg text-xs font-mono text-left border border-slate-300 break-all">
          <p className="font-bold text-slate-700 mb-1">Estado / Log:</p>
          <p className="text-slate-800">{debugLog}</p>
        </div>
      </div>
    </main>
  );
}