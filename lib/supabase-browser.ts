"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase para el navegador, con la clave pública (anon). Solo se usa para
// subir archivos con las URLs firmadas que genera el servidor (prepareListingUploads).
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
