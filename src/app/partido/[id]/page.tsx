import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { CallupCard } from "@/components/team/callups-section";
import { CompetitionFrame } from "@/components/team/competition-frame";
import { Countdown } from "@/components/team/countdown";
import { KatsuPlayerCard } from "@/components/team/katsu-card";
import { ShareButton } from "@/components/team/share-button";
import { competitionPath } from "@/lib/competition-paths";
import { findMatchContext as findMatch } from "@/lib/match-lookup";
import { pageMetadata } from "@/lib/metadata";

type MatchPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
    const found = await findMatch((await params).id);
    if (!found) return { title: "Partido no encontrado" };
    const { match } = found;
    const score = match.finalScore ?? "vs";
    const summary = match.chronicle?.replace(/\s+/g, " ").trim().slice(0, 160) || match.date;
    return pageMetadata(`J${match.jornada} · ${match.home} ${score} ${match.away}`, summary, `/partido/${match.key}/opengraph-image`);
}

export default async function MatchPage({ params }: MatchPageProps) {
    const found = await findMatch((await params).id);
    if (!found) notFound();
    const { competition, match, katsu, otherMatches } = found;
    const paragraphs = match.chronicle?.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()) ?? [];

    return (
        <CompetitionFrame competition={competition} activeSection="competition">
        {/* "#partido" en los enlaces lleva directamente aquí, sin tener que bajar desde la cabecera; el
            margen deja la ficha justo debajo del menú de secciones, que queda fijo arriba. */}
        <section id="partido" className="mx-auto max-w-3xl scroll-mt-[8.5rem] py-10 sm:scroll-mt-20 lg:scroll-mt-12">
            <Link href={competitionPath(competition)} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-white">
                <ArrowLeft size={14} /> Todos los partidos
            </Link>

            <div className="mt-6 border border-[var(--line)] bg-[var(--panel)] p-5 text-center sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">{competition.name} · Jornada {match.jornada}</p>
                <h2 className="mt-3 text-2xl font-black uppercase sm:text-3xl">{match.home} <span className="text-[var(--muted)]">vs</span> {match.away}</h2>
                <p className={`mt-4 font-mono text-4xl font-black sm:text-5xl ${match.status === "next" ? "text-[var(--lime)]" : ""}`}>{match.score}</p>
                <p className="mt-3 font-mono text-[10px] leading-5 tracking-[0.1em] text-[var(--muted)]">{match.date}</p>
                {match.status === "next" && match.startsAt ? <Countdown startsAt={match.startsAt} className="mt-3 block font-mono text-xs font-bold uppercase text-[var(--lime)]" /> : null}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                <ShareButton
                    path={`/partido/${match.key}`}
                    title={`Jornada ${match.jornada}`}
                    text={match.finalScore ? `⚽ J${match.jornada}: ${match.home} ${match.finalScore} ${match.away}` : `⚽ J${match.jornada}: ${match.home} vs ${match.away}`}
                />
                {match.status === "next" && match.startsAt ? (
                    <a href={`/partido/${match.key}/calendario`} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:border-[var(--lime)] hover:text-white">
                        <CalendarPlus size={14} /> Añadir al calendario
                    </a>
                ) : null}
                </div>
            </div>

            {paragraphs.length ? (
                <article className="mt-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Crónica</h3>
                    <div className="mt-4 space-y-4 text-sm leading-7 text-white/85">
                        {paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
                    </div>
                </article>
            ) : null}

            {katsu ? (
                <div className="mt-10">
                    <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Jugador KATSU</h3>
                    <div className="mx-auto mt-4 max-w-sm"><KatsuPlayerCard card={katsu} /></div>
                </div>
            ) : null}

            <div className="mt-10">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Convocatoria</h3>
                <CallupCard match={match} wide />
            </div>

            <div className="mt-10">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Otros partidos · Jornada {match.jornada}</h3>
                {otherMatches.length ? (
                    <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                        {otherMatches.map((roundMatch) => (
                            <li key={roundMatch.key} className="flex items-center justify-between gap-3 py-3 text-xs">
                                <span className="min-w-0 truncate">{roundMatch.home} <span className="mx-1 text-[var(--muted)]">vs</span> {roundMatch.away}</span>
                                <span className="shrink-0 font-mono font-bold">{roundMatch.score}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs text-[var(--muted)]">No hay otros partidos cargados para esta jornada.</p>}
            </div>
        </section>
        </CompetitionFrame>
    );
}
