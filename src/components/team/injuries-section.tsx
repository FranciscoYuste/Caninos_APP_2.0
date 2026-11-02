"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Ambulance, Cross } from "lucide-react";
import { PlayerDialog } from "@/components/team/player-dialog";
import type { Player } from "@/lib/team-types";

export function InjuriesSection({ squad }: { squad: Player[] }) {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const closePlayer = useCallback(() => setSelectedPlayer(null), []);

    return (
        <>
        <section className="py-10">
            <div className="mb-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-300">Parte médico · Bayern D.L. Caninos</p>
                <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">Lesionados</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Seguimiento de los jugadores actualmente lesionados.</p>
            </div>
            {squad.some((player) => player.injured) ? (
                <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
                    {squad.filter((player) => player.injured).map((player) => (
                        <article key={player.id} className="w-full overflow-hidden border border-red-300/30 bg-[var(--panel)] sm:w-[calc(50%-0.375rem)]">
                            <button type="button" onClick={() => setSelectedPlayer(player)} className="group flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]">
                                <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-red-300/50 bg-black/30 text-lg font-black text-red-100">
                                    {player.photo ? <Image src={player.photo} alt="" fill sizes="64px" unoptimized className="object-cover" /> : player.name.split(" ").map((part) => part[0]).join("")}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-base font-black uppercase text-white">{player.name}</span>
                                    <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{player.position} · #{player.number ?? "—"}</span>
                                </span>
                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-600 text-white shadow-[0_0_18px_#dc262655]"><Cross size={22} strokeWidth={3} /></span>
                            </button>
                            {player.injuryDescription ? <p className="border-t border-red-300/15 px-4 py-3 text-xs leading-5 text-white/75 sm:px-5">{player.injuryDescription}</p> : null}
                        </article>
                    ))}
                </div>
            ) : (
                <div className="mx-auto max-w-xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
                    <Ambulance className="mx-auto text-[var(--muted)]" size={30} />
                    <p className="mt-4 text-sm font-bold uppercase">No hay jugadores lesionados</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Si hay alguna baja, se añadirá aquí desde Administración.</p>
                </div>
            )}
        </section>
            {selectedPlayer ? <PlayerDialog player={selectedPlayer} onClose={closePlayer} /> : null}
        </>
    );
}
