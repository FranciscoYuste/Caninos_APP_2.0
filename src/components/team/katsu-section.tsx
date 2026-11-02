import { Star } from "lucide-react";
import { KatsuPlayerCard } from "@/components/team/katsu-card";
import { ShareButton } from "@/components/team/share-button";
import { FEATURED_TEAM } from "@/lib/config";
import type { KatsuCard } from "@/lib/team-types";

export function KatsuSection({ katsuCards, season }: { katsuCards: KatsuCard[]; season: string }) {
    return (
        <section className="py-10">
            <div className="mb-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--lime)]">{FEATURED_TEAM} · Temporada {season.replace("-", "—")}</p>
                <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">Jugador KATSU</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Un reconocimiento especial en cada partido. Pulsa la carta para descubrir quién se lleva la distinción.</p>
            </div>
            {katsuCards.length ? (
                <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
                    {katsuCards.map((card) => <div key={card.key} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"><KatsuPlayerCard card={card} /><ShareButton path={`/katsu/${card.key}`} title={`Jugador KATSU · Jornada ${card.jornada}`} text={`¿Quién es el Jugador KATSU de la jornada ${card.jornada}? 🃏`} className="mt-3 w-full" /></div>)}
                </div>
            ) : (
                <div className="mx-auto max-w-xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
                    <Star className="mx-auto text-[var(--lime)]" size={28} />
                    <p className="mt-4 text-sm font-bold uppercase">Todavía no hay jugadores KATSU</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Cuando se asigne un jugador a un partido del Bayern, su carta aparecerá aquí.</p>
                </div>
            )}
        </section>
    );
}
