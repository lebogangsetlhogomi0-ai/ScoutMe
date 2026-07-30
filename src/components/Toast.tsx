import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Module-level bridge so non-component code (e.g. AppContext.tsx business logic)
// can trigger a toast without needing the useToast() hook.
let globalShowToast: ((message: string, variant?: "success" | "info" | "error") => void) | null = null;

export const triggerGlobalToast = (message: string, variant: "success" | "info" | "error" = "success") => {
  if (globalShowToast) {
    globalShowToast(message, variant);
  } else {
    console.log(`[Toast:${variant}] ${message}`);
  }
};

interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "info" | "error";
}

interface ToastContextType {
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const variantStyles: Record<ToastItem["variant"], string> = {
  success: "bg-[#00e56b] border-[#00c55b] text-[#050e08]",
  info: "bg-[#0f2318] border-[#1a3825] text-[#e8f5ee]",
  error: "bg-red-950/90 border-red-500 text-red-200"
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: "success" | "info" | "error" = "success") => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      if (globalShowToast === showToast) globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center space-y-2 pointer-events-none w-full px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto max-w-sm w-full sm:w-auto border rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest shadow-2xl text-center ${variantStyles[t.variant]}`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
