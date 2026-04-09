"use client";

import { useState, useCallback } from "react";
import type { ToastMessage } from "@/components/ui/Toast";

type ToastVariant = "success" | "error" | "info";

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    info: (message: string) => addToast(message, "info"),
  };

  return { toasts, toast, dismiss };
}
