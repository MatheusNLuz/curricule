"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown01Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { getProfileInitials, getSafeProfileImage } from "@/lib/user-profile";
import type { SessionUser } from "@/lib/auth";
import { HugeIcon } from "@/components/ui/huge-icon";
import { cn } from "@/lib/utils";

export function AccountMenu({ session }: { session: SessionUser }) {
  const [open, setOpen] = useState(false);
  const popupId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayName = session.name?.trim() || "Sua conta";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Menu da conta: ${displayName}`}
        aria-expanded={open}
        aria-controls={popupId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-1.5 pr-2.5 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:pl-2"
      >
        <UserAvatar key={session.image ?? "no-image"} session={session} />
        <span className="hidden max-w-36 truncate text-[12px] font-semibold md:inline">{displayName}</span>
        <HugeIcon icon={ArrowDown01Icon} size={15} className={cn("hidden text-muted-foreground transition-transform md:block", open && "rotate-180")} />
      </button>

      {open && (
        <div id={popupId} className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl">
          <div className="flex min-w-0 items-center gap-3 px-2 py-2.5">
            <UserAvatar session={session} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <form action="/logout" method="post">
            <button type="submit" className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] font-medium text-signal transition-colors hover:bg-signal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40">
              <HugeIcon icon={Logout01Icon} size={16} />
              Sair da conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function UserAvatar({ session, className }: { session: SessionUser; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getSafeProfileImage(session.image);

  return (
    <span className={cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-soft-primary text-[11px] font-semibold text-primary", className)} aria-hidden="true">
      {image && !imageFailed ? (
        // Native img avoids requiring every OAuth image host in next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="size-full object-cover" />
      ) : (
        getProfileInitials(session.name, session.email)
      )}
    </span>
  );
}
