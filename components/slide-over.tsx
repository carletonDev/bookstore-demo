"use client";

import type React from "react";
import { useEffect, useRef } from "react";

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

type SlideOverPanelProps = {
  children: React.ReactNode;
  className?: string;
};

type SlideOverTitleProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Catalyst-style slide-over panel.
 *
 * Opens from the right edge of the viewport with a backdrop overlay.
 * Matches the Catalyst design language: zinc palette, ring borders, dark mode.
 */
export function SlideOver({
  open,
  onClose,
  children,
  className = "",
}: SlideOverProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${className}`.trim()}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/30 transition-opacity dark:bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Panel content area for the slide-over.
 */
export function SlideOverPanel({
  children,
  className = "",
}: SlideOverPanelProps) {
  return (
    <div
      className={`w-screen max-w-md transform bg-white shadow-xl transition-transform dark:bg-zinc-900 ${className}`.trim()}
    >
      <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Title element for the slide-over.
 */
export function SlideOverTitle({
  children,
  className = "",
}: SlideOverTitleProps) {
  return (
    <h2
      className={`text-lg/7 font-semibold text-zinc-950 dark:text-white ${className}`.trim()}
    >
      {children}
    </h2>
  );
}
