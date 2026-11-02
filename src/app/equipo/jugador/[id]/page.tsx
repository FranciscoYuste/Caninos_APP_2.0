import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PlayerCard } from "@/components/team/player-card";
import { ShareButton } from "@/components/team/share-button";
import { pageMetadata } from "@/lib/metadata";
import { getTeamData } from "@/lib/team-data";

type PlayerPageProps = { params: Promise<{ id: string }> };

async function findPlayer(id: string) {
    const data = await getTeamData();
    return data?.squad.find((player) => player.id === id) ?? null;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
    const player = await findPlayer((await params).id);
    if (!player) return { title: "Jugador no encontrado" };
    return pageMetadata(
        `${player.name}${player.number !== null ? ` · #${player.number}` : ""}`,
        `${player.position} · ${player.goals} goles · ${player.assists} asistencias · ${player.games} convocatorias`,
        `/equipo/jugador/${player.id}/opengraph-image`,
    );
}

export default async function PlayerPage({ params }: PlayerPageProps) {
    const player = await findPlayer((await params).id);
    if (!player) notFound();

    return (
        <section className="mx-auto max-w-xl py-10">
            <Link href="/equipo/jugadores" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-white">
                <ArrowLeft size={14} /> Todos los jugadores
            </Link>
            <div className="mt-6">
                <PlayerCard player={player} index={0} featured />
            </div>
            <div className="mt-4 flex justify-center">
                <ShareButton path={`/equipo/jugador/${player.id}`} title={`Ficha de ${player.name}`} text={`🃏 Ficha de ${player.name}`} />
            </div>
        </section>
    );
}
