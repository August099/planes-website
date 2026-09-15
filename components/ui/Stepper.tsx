"use client";

import React, { useState, ReactNode } from "react";

interface StepperProps {
  children: ReactNode[];
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  backButtonText?: string;
  nextButtonText?: string;
  disableStepIndicators?: boolean;
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  backButtonText = "Anterior",
  nextButtonText = "Siguiente",
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const steps = React.Children.toArray(children);
  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      onFinalStepCompleted?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  return (
    <div className="space-y-8">
      {/* Indicadores de Paso */}
      <div className="flex items-center justify-between border-b border-[#001F58]/15 pb-4 mb-6">
        {steps.map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#001F58] text-white ring-4 ring-[#001F58]/20"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {stepNumber}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  isActive ? "text-[#001F58]" : "text-slate-400"
                }`}
              >
                Paso {stepNumber}
              </span>
            </div>
          );
        })}
      </div>

      {/* Contenido del Paso Actual */}
      <div>{steps[currentStep - 1]}</div>

      {/* Navegación entre pasos */}
      <div className="flex justify-between items-center pt-4 border-t border-[#001F58]/15">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-5 py-2.5 rounded-xl text-xs font-bold border border-[#001F58]/20 text-[#001F58] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {backButtonText}
        </button>

        {currentStep < totalSteps && (
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#001F58] text-white hover:bg-[#001740] shadow-md transition-colors"
          >
            {nextButtonText}
          </button>
        )}
      </div>
    </div>
  );
}