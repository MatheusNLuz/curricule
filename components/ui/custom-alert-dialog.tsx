'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Alert02Icon, CheckmarkCircle02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeIcon } from '@/components/ui/huge-icon';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant: AlertVariant;
  /** Label for the primary action button. Defaults to variant-appropriate text. */
  actionLabel?: string;
  /** When provided, renders a two-button layout (Cancel + Action). */
  onAction?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Variant config                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    color: string;
    bg: string;
    hoverBg: string;
    icon: IconSvgElement;
    defaultAction: string;
  }
> = {
  success: {
    color: 'var(--route)',
    bg: 'color-mix(in srgb, var(--route) 15%, transparent)',
    hoverBg: 'color-mix(in srgb, var(--route) 25%, transparent)',
    icon: CheckmarkCircle02Icon,
    defaultAction: 'Continuar',
  },
  error: {
    color: 'var(--destructive)',
    bg: 'color-mix(in srgb, var(--destructive) 15%, transparent)',
    hoverBg: 'color-mix(in srgb, var(--destructive) 25%, transparent)',
    icon: Alert02Icon,
    defaultAction: 'Excluir',
  },
  warning: {
    color: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 15%, transparent)',
    hoverBg: 'color-mix(in srgb, var(--warning) 25%, transparent)',
    icon: Alert02Icon,
    defaultAction: 'Confirmar',
  },
  info: {
    color: 'var(--info)',
    bg: 'color-mix(in srgb, var(--info) 15%, transparent)',
    hoverBg: 'color-mix(in srgb, var(--info) 25%, transparent)',
    icon: InformationCircleIcon,
    defaultAction: 'Entendi',
  },
};

const ANIM_DURATION = 200; // ms

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  variant,
  actionLabel,
  onAction,
}: AlertDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const { color, bg, hoverBg, icon, defaultAction } = VARIANT_CONFIG[variant];
  const label = actionLabel ?? defaultAction;

  // ---------- mount/unmount with animation ----------
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setTimeout(() => setMounted(true), 0);
      // Force a frame so the initial state (scale-95 / opacity-0) is painted first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      const hideTimer = window.setTimeout(() => setVisible(false), 0);
      const timer = window.setTimeout(() => setMounted(false), ANIM_DURATION);
      return () => {
        window.clearTimeout(hideTimer);
        window.clearTimeout(timer);
      };
    }
  }, [open]);

  // ---------- close on Escape ----------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (mounted) {
      const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus(), 0);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        window.clearTimeout(focusTimer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mounted, handleKeyDown]);

  useEffect(() => {
    if (!mounted && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [mounted]);

  // ---------- don't render when not mounted ----------
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Inject hover keyframe */}
      <style>{`
        @keyframes alert-dialog-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, ${color} 20%, transparent); }
          50%      { box-shadow: 0 0 24px 4px color-mix(in srgb, ${color} 14%, transparent); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          backgroundColor: 'color-mix(in srgb, var(--background) 78%, transparent)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${ANIM_DURATION}ms ease`,
        }}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby={description ? 'alert-dialog-desc' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={dialogRef}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 440,
            margin: '0 16px',
            background: 'var(--surface)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 24px 64px color-mix(in srgb, var(--foreground) 28%, transparent), 0 0 0 1px color-mix(in srgb, var(--foreground) 6%, transparent)',
            transform: visible ? 'scale(1)' : 'scale(0.95)',
            opacity: visible ? 1 : 0,
            transition: `transform ${ANIM_DURATION}ms cubic-bezier(.4,0,.2,1), opacity ${ANIM_DURATION}ms ease`,
          }}
        >
          {/* ---- Content ---- */}
          <div className="flex flex-col items-center text-center px-8 pt-8 pb-6">
            {/* Icon circle */}
            <div
              className="rounded-full p-3 mb-5"
              style={{
                backgroundColor: bg,
                animation: 'alert-dialog-pulse 2.5s ease-in-out infinite',
              }}
            >
              <HugeIcon icon={icon} size={28} />
            </div>

            {/* Title */}
            <h2
              id="alert-dialog-title"
              className="text-lg font-semibold text-foreground leading-snug"
            >
              {title}
            </h2>

            {/* Description */}
            {description && (
              <p
                id="alert-dialog-desc"
                className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[360px]"
              >
                {description}
              </p>
            )}
          </div>

          {/* ---- Actions ---- */}
          <div
            className="flex items-center gap-3 px-8 pb-7"
            style={{ justifyContent: onAction ? 'flex-end' : 'center' }}
          >
            {onAction ? (
              <>
                {/* Cancel (ghost) */}
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    px-5 py-2.5 rounded-xl text-sm font-medium
                    text-muted-foreground hover:text-foreground
                    bg-transparent hover:bg-secondary
                    border border-border hover:border-primary/40
                    transition-colors duration-150 cursor-pointer
                  "
                >
                  Cancelar
                </button>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => {
                    onAction();
                    onClose();
                  }}
                  className="
                    px-5 py-2.5 rounded-xl text-sm font-semibold
                    text-primary-foreground transition-colors duration-150 cursor-pointer
                  "
                  style={{ backgroundColor: color, color: 'var(--primary-foreground)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = color)
                  }
                >
                  {label}
                </button>
              </>
            ) : (
              /* Single close button */
              <button
                type="button"
                onClick={onClose}
                className="
                  px-6 py-2.5 rounded-xl text-sm font-semibold
                    text-primary-foreground transition-colors duration-150 cursor-pointer
                "
                style={{ backgroundColor: color, color: 'var(--primary-foreground)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = hoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = color)
                }
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
