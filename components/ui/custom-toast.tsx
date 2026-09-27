'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeIcon } from '@/components/ui/huge-icon';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  /** internal – drives the exit animation */
  _exiting?: boolean;
}

interface ToastContextValue {
  toast: (opts: {
    title: string;
    description?: string;
    variant: ToastVariant;
    duration?: number;
  }) => string;
  dismiss: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Variant config                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<
  ToastVariant,
  { color: string; bg: string; icon: IconSvgElement }
> = {
  success: { color: 'var(--route)', bg: 'color-mix(in srgb, var(--route) 15%, transparent)', icon: CheckmarkCircle02Icon },
  error:   { color: 'var(--signal)', bg: 'color-mix(in srgb, var(--signal) 15%, transparent)', icon: Alert02Icon },
  warning: { color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 18%, transparent)', icon: Alert02Icon },
  info:    { color: 'var(--info)', bg: 'color-mix(in srgb, var(--info) 15%, transparent)', icon: InformationCircleIcon },
};

const EXIT_DURATION = 320; // ms – matches CSS transition

/* ------------------------------------------------------------------ */
/*  Single Toast                                                       */
/* ------------------------------------------------------------------ */

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData;
  onDismiss: (id: string) => void;
}) {
  const { color, bg, icon } = VARIANT_CONFIG[data.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(data.id), data.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        /* entrance / exit animation via inline transition */
        transform: data._exiting ? 'translateX(120%)' : 'translateX(0)',
        opacity: data._exiting ? 0 : 1,
        transition: `transform ${EXIT_DURATION}ms cubic-bezier(.4,0,.2,1), opacity ${EXIT_DURATION}ms ease`,
        border: `1px solid color-mix(in srgb, ${color} 35%, var(--border))`,
        background: 'var(--surface)',
        boxShadow: '0 8px 32px color-mix(in srgb, var(--foreground) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--foreground) 6%, transparent)',
        maxWidth: 400,
        minWidth: 'min(320px, calc(100vw - 32px))',
        pointerEvents: 'auto' as const,
      }}
      className="rounded-xl mb-3 overflow-hidden"
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 rounded-lg p-1.5 mt-0.5"
          style={{ backgroundColor: bg, color }}
        >
          <HugeIcon icon={icon} size={20} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            {data.title}
          </p>
          {data.description && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={() => onDismiss(data.id)}
          className="flex-shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Fechar notificação"
        >
          <HugeIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {/* Tiny progress bar that shrinks over `duration` */}
      <div className="h-[2px] w-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}>
        <div
          style={{
            height: '100%',
            backgroundColor: color,
            animation: `toast-shrink ${data.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast Container (portal)                                           */
/* ------------------------------------------------------------------ */

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* keyframes injected once */}
      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column-reverse',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} data={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    // 1. Mark as exiting (triggers slide-out animation)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, _exiting: true } : t)),
    );
    // 2. Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_DURATION);
  }, []);

  const toast = useCallback(
    (opts: {
      title: string;
      description?: string;
      variant: ToastVariant;
      duration?: number;
    }) => {
      const id = `toast-${++_counter}-${Date.now()}`;
      const newToast: ToastData = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant,
        duration: opts.duration ?? 5000,
      };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    [],
  );

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
