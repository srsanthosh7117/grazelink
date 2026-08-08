import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-card backdrop-blur-glass ${
                toast.type === 'success'
                  ? 'border-primary/20 bg-white/95 text-ink dark:border-primary/30 dark:bg-dark-card/95 dark:text-white'
                  : 'border-rose-200 bg-white/95 text-ink dark:border-rose-500/30 dark:bg-dark-card/95 dark:text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <FiCheckCircle className="mt-0.5 shrink-0 text-lg text-primary" />
              ) : (
                <FiAlertCircle className="mt-0.5 shrink-0 text-lg text-rose-500" />
              )}
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="text-muted hover:text-ink dark:text-dark-muted dark:hover:text-white"
              >
                <FiX />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
