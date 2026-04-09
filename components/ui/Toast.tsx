"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-sage text-cream",
  error: "bg-coral text-cream",
  info: "bg-dark text-cream",
};

const icons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
        "animate-in slide-in-from-bottom-2",
        variantClasses[toast.variant],
      ].join(" ")}
    >
      <span aria-hidden="true">{icons[toast.variant]}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
