import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CompetitionFrame } from "@/components/team/competition-frame";
import { KatsuPlayerCard } from "@/components/team/katsu-card";
import { ShareButton } from "@/components/team/share-button";
import { competitionPath } from "@/lib/competition-paths";
import { findMatchContext } from "@/lib/match-lookup";
import { pageMetadata } from "@/lib/metadata";

type KatsuPageProps = { params: Promise<{ id: string }> };

async function findCard(id: string) {
    const found = await findMatchContext(id);
    return found?.katsu ? { competition: found.competition, card: found.katsu } : null;
}

// La vista previa no desvela al jugador: hay que entrar y girar la carta.
export async function generateMetadata({ params }: KatsuPageProps): Promise<Metadata> {
    const found = await findCard((await params).id);
    if (!found) return { title: "Carta no encontrada" };
    const { card } = found;
    return pageMetadata(`Jugador KATSU · Jornada ${card.jornada}`, `${card.home} vs ${card.away}. ¿Quién se lleva la carta? Entra y descúbrelo.`, `/katsu/${card.key}/opengraph-image`);
}

export default async function KatsuCardPage({ params }: KatsuPageProps) {
    const found = await findCard((await params).id);
    if (!found) notFound();
    const { competition, card } = found;

    return (
        <CompetitionFrame competition={competition} activeSection="katsu">
            <section className="mx-auto max-w-sm py-10">
                <Link href={competitionPath(competition, "katsu")} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-white">
                    <ArrowLeft size={14} /> Todas las cartas KATSU
                </Link>
                <div className="mt-6"><KatsuPlayerCard card={card} /></div>
                <ShareButton
                    path={`/katsu/${card.key}`}
                    title={`Jugador KATSU · Jornada ${card.jornada}`}
                    text={`¿Quién es el Jugador KATSU de la jornada ${card.jornada}? 🃏`}
                    className="mt-4 w-full"
                />
            </section>
        </CompetitionFrame>
    );
}
