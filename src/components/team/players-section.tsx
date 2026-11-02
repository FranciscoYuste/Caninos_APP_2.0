"use client";

import { useCallback, useState } from "react";
import { PlayerField } from "@/components/player-field";
import { PlayerDialog } from "@/components/team/player-dialog";
import type { Player } from "@/lib/team-types";

const ROLES = [
    { id: "goalkeeper", label: "Portero" },
    { id: "defender", label: "Cierre" },
    { id: "left-wing", label: "Ala izquierda" },
    { id: "right-wing", label: "Ala derecha" },
    { id: "pivot", label: "Pívot" },
    { id: "unspecified", label: "Posición por definir" },
];

function getRole(position: string) {
    const normalized = position.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalized.includes("port")) return "goalkeeper";
    if (normalized.includes("cierre")) return "defender";
    if (normalized.includes("pivot")) return "pivot";
    if (normalized.includes("ala")) {
        if (normalized.includes("izq")) return "left-wing";
        if (normalized.includes("der")) return "right-wing";
    }
    return "unspecified";
}

export function PlayersSection({ squad, emptyMessage, season }: { squad: Player[]; emptyMessage: string; season: string }) {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const closePlayer = useCallback(() => setSelectedPlayer(null), []);
    const playersByRole = new Map(ROLES.map((role) => [role.id, squad.filter((player) => getRole(player.position) === role.id)]));

    return (
        <>
        <section id="plantilla" className="py-10">
            <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">El grupo</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Jugadores <span className="font-normal text-[var(--muted)]">/ {squad.length}</span></h2><p className="mt-3 text-sm text-[var(--muted)]">Elige el modo de campo que prefieras y selecciona un jugador para abrir su ficha y consultar sus estadísticas.</p></div>
            {squad.length ? (
                <PlayerField playersByRole={playersByRole} roles={ROLES} onSelect={setSelectedPlayer} season={season} />
            ) : <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p>}
        </section>
            {selectedPlayer ? <PlayerDialog player={selectedPlayer} onClose={closePlayer} /> : null}
        </>
    );
}
