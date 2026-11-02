"use client";

import Image from "next/image";
import { useState } from "react";
import { Star } from "lucide-react";
import type { KatsuCard } from "@/lib/team-types";

export function KatsuPlayerCard({ card }: { card: KatsuCard }) {
    const [revealed, setRevealed] = useState(false);

    return (
        <button
            type="button"
            aria-pressed={revealed}
            aria-label={`${revealed ? "Ocultar" : "Revelar"} carta KATSU de ${card.player.name}, jornada ${card.jornada}`}
            onClick={() => setRevealed((value) => !value)}
            className="katsu-card-shell group relative block aspect-[3/4] w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] [perspective:1400px]"
        >
            <span className={`katsu-card-inner absolute inset-0 ${revealed ? "is-revealed" : ""}`}>
                <span className="katsu-card-face katsu-card-front absolute inset-0 flex flex-col overflow-hidden border border-[var(--lime)]/70 bg-[radial-gradient(ellipse_at_50%_28%,#55592c_0%,#25291d_36%,#111311_80%)] p-4 shadow-[0_16px_50px_#0008] [backface-visibility:hidden] sm:p-6">
                    <span className="pointer-events-none absolute inset-2 border border-white/15" />
                    <span className="katsu-card-orbit pointer-events-none absolute -right-12 top-16 size-48 rounded-full border border-[var(--lime)]/15" />
                    <span className="katsu-card-orbit katsu-card-orbit-inner pointer-events-none absolute -right-7 top-21 size-36 rounded-full border border-[var(--lime)]/20" />
                    <span className="pointer-events-none absolute -left-16 top-1/3 h-px w-[150%] rotate-[-28deg] bg-gradient-to-r from-transparent via-[var(--lime)]/20 to-transparent" />
                    <span className="relative flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-[var(--lime)] sm:text-xs sm:tracking-[0.2em]">
                        <span>Temporada {card.season.replace("-", "—")}</span><Star size={21} fill="currentColor" />
                    </span>
                    <span className="relative mt-2 flex justify-center">
                        <Image src="/fotos/escudo-256.png" alt="Escudo de Bayern D.L. Caninos" width={76} height={76} className="size-[4.5rem] object-contain drop-shadow-[0_0_12px_#f2cf1870] sm:size-20" />
                    </span>
                    <span className="relative my-auto flex flex-col items-center text-center">
                        <span className="text-6xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl">Jugador</span>
                        <span className="mt-1 text-[clamp(4.5rem,20vw,6rem)] font-black uppercase leading-[0.78] tracking-[-0.07em] text-[var(--lime)] drop-shadow-[0_4px_18px_#f2cf1855] sm:text-8xl">KATSU</span>
                        <span className="mt-5 border-t border-white/20 px-5 pt-3 text-center sm:mt-6 sm:pt-4">
                            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-white/65 sm:text-sm">Jornada</span>
                            <span className="mt-1 block font-mono text-6xl font-black leading-none text-white sm:text-7xl">{String(card.jornada).padStart(2, "0")}</span>
                        </span>
                    </span>
                    <span className="relative mt-3 flex flex-col items-center gap-2 border-t border-white/20 pt-3 text-center sm:mt-4 sm:pt-4">
                        <span className="max-w-full truncate text-sm font-bold text-white/85 sm:text-sm">{card.home} <span className="text-white/50">vs</span> {card.away}</span>
                        <span className="font-mono text-xl font-black tracking-wide text-white sm:text-2xl">{card.score ?? "Resultado pendiente"}</span>
                    </span>
                    <span className="relative mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--lime)] sm:text-[10px]"><span className="size-1.5 rounded-full bg-[var(--lime)]" /> Pulsa para descubrir</span>
                </span>
                <span className="katsu-card-face katsu-card-back absolute inset-0 flex flex-col overflow-hidden border border-[var(--lime)]/75 bg-[#171a15] shadow-[0_16px_50px_#0008] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <span className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#55592c,#1a1d1a_74%)]">
                        {card.player.photo
                            ? <Image src={card.player.photo} alt={`Foto de ${card.player.name}`} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="katsu-card-player-image object-cover object-top" />
                            : <span className="absolute inset-0 grid place-items-center font-black text-8xl text-[var(--lime)]">{card.player.name.split(" ").map((part) => part[0]).join("").slice(0, 3)}</span>}
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111311] via-transparent to-black/20" />
                        <span className="player-card-number absolute left-2 top-3 font-sans text-7xl font-black italic leading-[0.75] sm:left-3 sm:text-6xl">{card.player.number ?? "—"}</span>
                        <span className="player-card-crest absolute right-2 top-2 sm:right-3 sm:top-3">
                            <Image src="/fotos/escudo-256.png" alt="Escudo de Bayern D.L. Caninos" width={80} height={80} className="size-16 object-contain drop-shadow-lg sm:size-20" />
                        </span>
                        <span className="absolute inset-x-0 bottom-0 px-4 pb-5 pt-16 sm:px-5 sm:pb-6">
                            <span className="block text-[1.65rem] font-black uppercase leading-tight tracking-[0.08em] text-[var(--lime)] sm:text-lg sm:tracking-[0.12em]">Jugador KATSU · J{card.jornada}</span>
                            <span className="mt-1 block text-[2.75rem] font-black uppercase leading-tight text-white sm:text-3xl">{card.player.name}</span>
                            <span className="mt-2 block text-lg font-bold uppercase tracking-[0.16em] text-white/85 sm:text-sm">{card.player.position}</span>
                        </span>
                    </span>
                </span>
            </span>
        </button>
    );
}
