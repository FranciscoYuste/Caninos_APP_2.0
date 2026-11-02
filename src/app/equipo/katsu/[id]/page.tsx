import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KatsuPlayerCard } from "@/components/team/katsu-card";
import { ShareButton } from "@/components/team/share-button";
import { pageMetadata } from "@/lib/metadata";
import { getTeamData } from "@/lib/team-data";

type KatsuPageProps = { params: Promise<{ id: string }> };

async function findCard(id: string) {
    const data = await getTeamData();
    return data?.katsuCards.find((card) => card.key === id) ?? null;
}

// La vista previa no desvela al jugador: hay que entrar y girar la carta.
export async function generateMetadata({ params }: KatsuPageProps): Promise<Metadata> {
    const card = await findCard((await params).id);
    if (!card) return { title: "Carta no encontrada" };
    return pageMetadata(`Jugador KATSU · Jornada ${card.jornada}`, `${card.home} vs ${card.away}. ¿Quién se lleva la carta? Entra y descúbrelo.`, `/equipo/katsu/${card.key}/opengraph-image`);
}

export default async function KatsuCardPage({ params }: KatsuPageProps) {
    const card = await findCard((await params).id);
    if (!card) notFound();

    return (
        <section className="mx-auto max-w-sm py-10">
            <Link href="/equipo/katsu" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-white">
                <ArrowLeft size={14} /> Todas las cartas KATSU
            </Link>
            <div className="mt-6"><KatsuPlayerCard card={card} /></div>
            <ShareButton
                path={`/equipo/katsu/${card.key}`}
                title={`Jugador KATSU · Jornada ${card.jornada}`}
                text={`¿Quién es el Jugador KATSU de la jornada ${card.jornada}? 🃏`}
                className="mt-4 w-full"
            />
        </section>
    );
}
