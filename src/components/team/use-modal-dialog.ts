"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, video, [tabindex]:not([tabindex="-1"])';

// Comportamiento accesible de una ventana modal: foco dentro al abrir, Tab no se escapa,
// Esc cierra, el fondo no hace scroll y al cerrar el foco vuelve a donde estaba.
// onClose debe ser estable (useCallback) para no reiniciar el efecto en cada render.
export function useModalDialog<T extends HTMLElement>(onClose: () => void) {
    const dialogRef = useRef<T>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus();
        };
    }, [onClose]);

    return dialogRef;
}
