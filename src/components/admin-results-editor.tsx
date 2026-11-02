"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";
import { FEATURED_TEAM } from "@/lib/config";

export type ResultMatch = { id: string; jornada: number; home: string; away: string; homeGoals: number | null; awayGoals: number | null; kickoff: string | null };
type Draft = { home: string; away: string };
type SaveState = { busy: boolean; message: string; error: boolean };

const IDLE: SaveState = { busy: false, message: "", error: false };
const SCORE_INPUT = "h-12 w-12 border border-[var(--line)] bg-[var(--ink)] text-center text-lg font-black text-white focus:border-[var(--lime)] focus:outline-none";

function savedDraft(match: ResultMatch): Draft {
    return { home: match.homeGoals?.toString() ?? "", away: match.awayGoals?.toString() ?? "" };
}

function asGoals(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
}

// Marcadores editables de uno o varios partidos. Vaciar las dos casillas quita el resultado.
export function AdminResultsEditor({ competitionId, matches }: { competitionId: string; matches: ResultMatch[] }) {
    const router = useRouter();
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [state, setState] = useState<SaveState>(IDLE);
    // Cuando llegan datos nuevos del servidor (tras guardar aquí o en otra sección), se descartan los borradores.
    const signature = matches.map((match) => `${match.id}:${match.homeGoals}-${match.awayGoals}`).join("|");
    const [seenSignature, setSeenSignature] = useState(signature);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setDrafts({});
    }

    const changed = matches.filter((match) => {
        const draft = drafts[match.id];
        if (!draft) return false;
        const saved = savedDraft(match);
        return draft.home.trim() !== saved.home || draft.away.trim() !== saved.away;
    });

    function update(match: ResultMatch, side: keyof Draft, value: string) {
        const clean = value.replace(/\D/g, "").slice(0, 2);
        setDrafts((previous) => ({ ...previous, [match.id]: { ...(previous[match.id] ?? savedDraft(match)), [side]: clean } }));
        setState(IDLE);
    }

    async function save() {
        const payload = changed.map((match) => {
            const draft = drafts[match.id];
            return { partido_id: match.id, goles_local: asGoals(draft.home), goles_visitante: asGoals(draft.away) };
        });
        if (payload.some((item) => (item.goles_local === null) !== (item.goles_visitante === null))) {
            setState({ busy: false, message: "Indica los goles de los dos equipos o deja ambos vacíos.", error: true });
            return;
        }
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/results", { competicion_id: competitionId, partidos: payload });
            setState({ busy: false, message: `${payload.length === 1 ? "Resultado guardado" : `${payload.length} resultados guardados`} · clasificación actualizada.`, error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    return (
        <div className="space-y-3">
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {matches.map((match) => {
                    const draft = drafts[match.id] ?? savedDraft(match);
                    const isChanged = changed.includes(match);
                    return (
                        <li key={match.id} className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3 ${isChanged ? "bg-[var(--lime)]/5" : ""}`}>
                            <span className={`truncate text-right text-xs font-bold ${match.home === FEATURED_TEAM ? "text-[var(--lime)]" : ""}`}>{match.home}</span>
                            <span className="flex items-center gap-1.5">
                                <input aria-label={`Goles de ${match.home}`} inputMode="numeric" pattern="[0-9]*" value={draft.home} onChange={(event) => update(match, "home", event.target.value)} placeholder="–" className={SCORE_INPUT} />
                                <span className="text-[var(--muted)]">-</span>
                                <input aria-label={`Goles de ${match.away}`} inputMode="numeric" pattern="[0-9]*" value={draft.away} onChange={(event) => update(match, "away", event.target.value)} placeholder="–" className={SCORE_INPUT} />
                            </span>
                            <span className={`truncate text-xs font-bold ${match.away === FEATURED_TEAM ? "text-[var(--lime)]" : ""}`}>{match.away}</span>
                        </li>
                    );
                })}
            </ul>
            <p className="text-[10px] text-[var(--muted)]">Vacía las dos casillas para quitar un resultado. Al guardar se recalcula la clasificación.</p>
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={state.busy || !changed.length} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                    <Check size={15} /> {state.busy ? "Guardando..." : changed.length > 1 ? `Guardar ${changed.length} resultados` : "Guardar resultado"}
                </button>
                {changed.length ? <button type="button" disabled={state.busy} onClick={() => setDrafts({})} className="min-h-11 px-2 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">Descartar</button> : null}
                {state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
            </div>
        </div>
    );
}

function defaultRound(matches: ResultMatch[]): number {
    const now = Date.now();
    // La primera jornada con un partido ya jugado (por fecha) y sin resultado; si no, la primera pendiente.
    const overdue = matches.find((match) => match.homeGoals === null && match.kickoff && Date.parse(match.kickoff) < now);
    const pending = matches.find((match) => match.homeGoals === null);
    return (overdue ?? pending ?? matches.at(-1))?.jornada ?? 1;
}

// Resultados de todos los partidos de una jornada, también los de los rivales: la clasificación los necesita.
export function AdminRoundResults({ competitionId, matches }: { competitionId: string; matches: ResultMatch[] }) {
    const rounds = [...new Set(matches.map((match) => match.jornada))].sort((a, b) => a - b);
    const [round, setRound] = useState(() => defaultRound(matches));
    const index = rounds.indexOf(round);

    if (!rounds.length) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Esta competición aún no tiene calendario. Cárgalo desde la importación por CSV.</p>;
    }

    const roundMatches = matches.filter((match) => match.jornada === round);
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <button type="button" aria-label="Jornada anterior" disabled={index <= 0} onClick={() => setRound(rounds[index - 1])} className="grid size-11 shrink-0 place-items-center border border-[var(--line)] disabled:opacity-30"><ChevronLeft size={16} /></button>
                <select value={round} onChange={(event) => setRound(Number(event.target.value))} className="min-h-11 min-w-0 flex-1 border border-[var(--line)] bg-[var(--ink)] px-3 text-sm text-white focus:border-[var(--lime)] focus:outline-none">
                    {rounds.map((item) => {
                        const inRound = matches.filter((match) => match.jornada === item);
                        const played = inRound.filter((match) => match.homeGoals !== null).length;
                        return <option key={item} value={item}>Jornada {item} · {played}/{inRound.length} resultados</option>;
                    })}
                </select>
                <button type="button" aria-label="Jornada siguiente" disabled={index >= rounds.length - 1} onClick={() => setRound(rounds[index + 1])} className="grid size-11 shrink-0 place-items-center border border-[var(--line)] disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
            <AdminResultsEditor key={round} competitionId={competitionId} matches={roundMatches} />
        </div>
    );
}
