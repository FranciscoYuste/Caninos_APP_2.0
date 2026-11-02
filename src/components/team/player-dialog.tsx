"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PlayerCard } from "@/components/team/player-card";
import { ShareButton } from "@/components/team/share-button";
import type { Player } from "@/lib/team-types";

export function PlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
    const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [onClose]);

    return (
        <div
            className="player-profile-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-8"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="selected-player-title"
                className="player-profile-dialog relative max-h-[92vh] w-full max-w-xl overflow-y-auto p-2 sm:p-4"
            >
                <button
                    type="button"
                    aria-label="Cerrar ficha del jugador"
                    onClick={onClose}
                    className="player-profile-close absolute right-4 top-4 z-20 grid size-11 place-items-center border border-[var(--lime)]/70 bg-black/85 text-white transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                    <X size={21} />
                </button>
                <h2 id="selected-player-title" className="sr-only">Ficha de {player.name}</h2>
                <div
                    className="player-profile-card"
                    onPointerMove={(event) => {
                        if (event.pointerType !== "mouse") return;
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                        setCardTilt({ x: x * 8, y: y * -8 });
                    }}
                    onPointerLeave={() => setCardTilt({ x: 0, y: 0 })}
                    style={{ transform: `perspective(1200px) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg)` }}
                >
                    <PlayerCard player={player} index={0} featured />
                </div>
                <div className="mt-3 flex justify-center">
                    <ShareButton path={`/equipo/jugador/${player.id}`} title={`Ficha de ${player.name}`} text={`🃏 Ficha de ${player.name}`} className="bg-black/70" />
                </div>
                <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">Mueve el puntero sobre la carta · Esc para cerrar</p>
            </section>
        </div>
    );
}
