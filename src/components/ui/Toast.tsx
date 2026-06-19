import { useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '../ui/Button';

export type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={18} className="text-success shrink-0" />,
    error: <XCircle size={18} className="text-error shrink-0" />,
    warning: <AlertTriangle size={18} className="text-warning shrink-0" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-card shadow-modal border border-border-card bg-card animate-in slide-in-from-right-5 text-sm'
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-text-main">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-text-muted hover:text-text-main">
        <X size={16} />
      </button>
    </div>
  );
}

import { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
