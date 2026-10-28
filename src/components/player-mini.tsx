"use client";

import Image from "next/image";
import { Cross } from "lucide-react";
import type { Player } from "@/components/team-dashboard";

export function PlayerMini({ player, onSelect }: { player: Player; onSelect: () => void }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-label={`Ver ficha de ${player.name}, ${player.position}${player.injured ? ", lesionado" : ""}`}
            className="group flex w-full min-w-0 flex-col items-center gap-1 rounded-sm px-0.5 py-1 text-center transition hover:scale-105 hover:bg-black/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
        >
            <span className={`relative grid size-14 shrink-0 place-items-center text-sm font-bold text-white transition group-hover:scale-110 ${player.photo ? "" : "overflow-hidden rounded-full border border-white/50 bg-[#343a32] group-hover:border-[var(--lime)]"}`}>
                {player.photo
                    ? <Image src={player.photo} alt="" fill sizes="56px" unoptimized className="object-contain drop-shadow-[0_3px_8px_#000]" />
                    : player.name.split(" ").map((part) => part[0]).join("")}
                {player.injured ? <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-[#1c2920] bg-red-600 text-white" title="Jugador lesionado"><Cross size={13} strokeWidth={3} /></span> : null}
            </span>
            <span className="max-w-full truncate text-[9px] font-semibold leading-tight text-white sm:text-[10px]">{player.name}</span>
        </button>
    );
}
