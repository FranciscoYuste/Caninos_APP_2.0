"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// En el móvil abre el menú nativo de compartir (WhatsApp incluido); si no existe, copia el enlace.
export function ShareButton({ path, title, text, className = "" }: { path: string; title: string; text: string; className?: string }) {
    const [copied, setCopied] = useState(false);

    async function share() {
        const url = new URL(path, window.location.origin).toString();
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
            }
        }
        try {
            await navigator.clipboard.writeText(`${text} ${url}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt("Copia el enlace:", url);
        }
    }

    return (
        <button
            type="button"
            onClick={share}
            className={`inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--lime)]/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--lime)] transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)] ${className}`}
        >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied ? "Enlace copiado" : "Compartir"}
        </button>
    );
}
