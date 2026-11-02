"use client";

import { X } from "lucide-react";
import { PlayerCard, PlayerMatchDetail } from "@/components/team/player-card";
import { ShareButton } from "@/components/team/share-button";
import { useModalDialog } from "@/components/team/use-modal-dialog";
import type { Player } from "@/lib/team-types";

export function PlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
    const dialogRef = useModalDialog<HTMLElement>(onClose);

    return (
        <div
            className="player-profile-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-8"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                ref={dialogRef}
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
                <div className="player-profile-card pt-12">
                    <PlayerCard player={player} />
                </div>
                <div className="mt-3 flex justify-center">
                    <ShareButton path={`/jugador/${player.id}`} title={`Ficha de ${player.name}`} text={`🃏 Ficha de ${player.name}`} className="bg-black/70" />
                </div>
                <PlayerMatchDetail player={player} />
                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Arrastra la carta a un lado o tócala para darle la vuelta</p>
            </section>
        </div>
    );
}
