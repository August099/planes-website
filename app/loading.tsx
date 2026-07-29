"use client";

import React from "react";

export default function LoadingScreen() {
  return (
    <div className="min-h-[70vh] w-full bg-background text-foreground flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-6">
        
        <div className="relative w-56 h-56 rounded-full border border-border bg-slate-50/50 shadow-inner flex items-center justify-center overflow-hidden">
          
          <div className="absolute w-3/4 h-3/4 rounded-full border border-border/60" />
          <div className="absolute w-1/2 h-1/2 rounded-full border border-border/60" />
          <div className="absolute w-1/4 h-1/4 rounded-full border border-border/60" />

          <div className="absolute w-full h-[1px] bg-border/60" />
          <div className="absolute h-full w-[1px] bg-border/60" />

          <div className="absolute inset-0 w-full h-full rounded-full animate-spin [animation-duration:3s] [animation-timing-function:linear]">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-primary/25 to-transparent origin-bottom-right rounded-tl-full" />
          </div>

          <div className="z-10 text-primary drop-shadow-sm">
            <svg
              className="w-7 h-7 transform -rotate-45"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground tracking-tight">
            Cargando información...
          </p>
          <p className="text-sm text-muted-foreground">
            Buscando y actualizando las mejores publicaciones
          </p>
        </div>

      </div>
    </div>
  );
}