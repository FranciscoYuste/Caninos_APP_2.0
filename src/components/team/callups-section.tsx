import Image from "next/image";
import Link from "next/link";
import type { MatchItem } from "@/lib/team-types";

export function CallupCard({ match, linkToMatch = false, wide = false }: { match: MatchItem; linkToMatch?: boolean; wide?: boolean }) {
    const calledUp = match.callups?.filter((player) => player.calledUp) ?? [];
    const notCalledUp = match.callups?.filter((player) => !player.calledUp) ?? [];
    return <article className={`w-full border border-[var(--line)] bg-[var(--panel)] p-5 ${wide ? "" : "md:w-[calc(50%-0.5rem)]"}`}><p className="font-mono text-[10px] tracking-[0.12em] text-[var(--lime)]">{match.date}</p><h3 className="mt-3 text-sm font-bold">{linkToMatch ? <Link href={`/equipo/partido/${match.key}`} className="underline-offset-4 hover:text-[var(--lime)] hover:underline">{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</Link> : <>{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</>}</h3>{match.finalScore ? <p className="mt-3 text-xs uppercase tracking-[0.1em] text-[var(--muted)]">Resultado <span className="ml-2 font-mono text-lg font-black tracking-normal text-white">{match.finalScore}</span></p> : null}{match.callupPhotoUrl ? <div className="relative mt-4 aspect-[4/3] overflow-hidden bg-black/30"><Image src={match.callupPhotoUrl} alt={`Foto del equipo: ${match.home} vs ${match.away}`} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div> : null}{match.callups?.length ? <><div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Convocados · {calledUp.length}</p>{calledUp.length ? <div className="flex flex-wrap gap-2">{calledUp.map((player) => <span key={player.name} className="border border-[var(--lime)]/40 px-2 py-1 text-[10px] text-[var(--lime)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Ninguno indicado todavía.</p>}</div><div className="mt-4 border-t border-[var(--line)] pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">No convocados · {notCalledUp.length}</p>{notCalledUp.length ? <div className="flex flex-wrap gap-2">{notCalledUp.map((player) => <span key={player.name} className="border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--muted)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Todos los jugadores están convocados.</p>}</div></> : <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">Convocatoria todavía no publicada.</p>}</article>;
}

export function CallupsSection({ results, emptyMessage }: { results: MatchItem[]; emptyMessage: string }) {
    return (
        <section className="py-10">
            <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Convocatorias · Bayern D.L.Caninos</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Partido a partido</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Consulta quién fue convocado y quién no en cada encuentro. La hora y el campo aparecen cuando se confirman.</p></div>
            <div className="flex flex-wrap justify-center gap-4">{results.map((match) => <CallupCard key={match.key} match={match} linkToMatch />)}</div>
            {!results.length ? <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p> : null}
        </section>
    );
}
