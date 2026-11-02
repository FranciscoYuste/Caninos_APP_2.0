"use client";

import { X } from "lucide-react";
import { ShareButton } from "@/components/team/share-button";
import { useModalDialog } from "@/components/team/use-modal-dialog";
import type { MatchItem } from "@/lib/team-types";

export function ChronicleDialog({ match, onClose }: { match: MatchItem; onClose: () => void }) {
    const dialogRef = useModalDialog<HTMLElement>(onClose);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="match-chronicle-title"
                className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[var(--lime)]/50 bg-[var(--panel)] p-5 shadow-2xl sm:p-8"
            >
                <button
                    type="button"
                    aria-label="Cerrar crónica"
                    onClick={onClose}
                    className="absolute right-4 top-4 grid size-10 place-items-center border border-[var(--line)] text-white hover:border-[var(--lime)] hover:text-[var(--lime)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                >
                    <X size={20} />
                </button>
                <p className="pr-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Crónica · Jornada {match.jornada}</p>
                <h2 id="match-chronicle-title" className="mt-3 pr-12 text-xl font-black uppercase sm:text-2xl">
                    {match.home} <span className="text-[var(--muted)]">vs</span> {match.away}
                </h2>
                <p className="mt-3 border-b border-[var(--line)] pb-4 font-mono text-xs leading-5 text-[var(--muted)]">
                    {match.date}<span className="mx-2">·</span><span className="font-bold text-white">{match.score}</span>
                </p>
                <ShareButton path={`/equipo/partido/${match.key}`} title={`Crónica · Jornada ${match.jornada}`} text={`📰 Crónica J${match.jornada}: ${match.home} ${match.score} ${match.away}`} className="mt-4" />
                <div className="mt-6 space-y-4 text-sm leading-7 text-white/85">
                    {match.chronicle?.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
                    ))}
                </div>
            </section>
        </div>
    );
}
