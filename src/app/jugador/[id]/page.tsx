import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CompetitionFrame } from "@/components/team/competition-frame";
import { PlayerCard } from "@/components/team/player-card";
import { ShareButton } from "@/components/team/share-button";
import { competitionPath } from "@/lib/competition-paths";
import { pageMetadata } from "@/lib/metadata";
import { findPlayerContext } from "@/lib/player-lookup";

type PlayerPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
    const found = await findPlayerContext((await params).id);
    if (!found) return { title: "Jugador no encontrado" };
    const { player } = found;
    return pageMetadata(
        `${player.name}${player.number !== null ? ` · #${player.number}` : ""}`,
        `${player.position} · ${player.goals} goles · ${player.assists} asistencias · ${player.games} convocatorias`,
        `/jugador/${player.id}/opengraph-image`,
    );
}

export default async function PlayerPage({ params }: PlayerPageProps) {
    const found = await findPlayerContext((await params).id);
    if (!found) notFound();
    const { competition, player, summaries } = found;
    const totals = summaries.reduce((sum, item) => ({ goals: sum.goals + item.goals, assists: sum.assists + item.assists, games: sum.games + item.games }), { goals: 0, assists: 0, games: 0 });

    return (
        <CompetitionFrame competition={competition} activeSection="jugadores">
            <section className="mx-auto max-w-xl py-10">
                <Link href={competitionPath(competition, "jugadores")} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-white">
                    <ArrowLeft size={14} /> Todos los jugadores
                </Link>
                <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">{competition.name} · {competition.season}</p>
                <div className="mt-3">
                    <PlayerCard player={player} index={0} featured />
                </div>
                <div className="mt-4 flex justify-center">
                    <ShareButton path={`/jugador/${player.id}`} title={`Ficha de ${player.name}`} text={`🃏 Ficha de ${player.name}`} />
                </div>
                {summaries.length > 1 ? (
                    <div className="mt-8">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {competition.season} por competición</h2>
                        <table className="mt-3 w-full border-collapse text-left text-xs">
                            <thead><tr className="border-y border-[var(--line)] text-[10px] text-[var(--muted)]"><th className="py-2">Competición</th><th className="text-center">Goles</th><th className="text-center">Asist.</th><th className="text-center">Conv.</th></tr></thead>
                            <tbody>
                                {summaries.map((item) => (
                                    <tr key={item.competition.id} className="border-b border-[var(--line)]">
                                        <td className="py-3"><Link href={competitionPath(item.competition, "jugadores")} className="hover:text-[var(--lime)]">{item.competition.name}</Link></td>
                                        <td className="text-center font-mono">{item.goals}</td><td className="text-center font-mono">{item.assists}</td><td className="text-center font-mono">{item.games}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold text-[var(--lime)]"><td className="py-3">Total</td><td className="text-center font-mono">{totals.goals}</td><td className="text-center font-mono">{totals.assists}</td><td className="text-center font-mono">{totals.games}</td></tr>
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </section>
        </CompetitionFrame>
    );
}
