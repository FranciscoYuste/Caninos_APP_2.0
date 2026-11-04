"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminCallupForm } from "@/components/admin-callup-form";
import { AdminKatsuPicker } from "@/components/admin-katsu-picker";
import { AdminMatchFantasy, type FantasySaved } from "@/components/admin-match-fantasy";
import { AdminMatchChronicle } from "@/components/admin-match-chronicle";
import { AdminMatchPhoto } from "@/components/admin-media";
import { AdminMatchStats } from "@/components/admin-match-stats";
import { AdminResultsEditor } from "@/components/admin-results-editor";
import { FEATURED_TEAM } from "@/lib/config";
import { hasStats, type MatchStatLine } from "@/lib/players";

export type HubMatch = {
    id: string;
    jornada: number;
    home: string;
    away: string;
    kickoff: string | null;
    scheduleLabel: string;
    date: string;
    time: string;
    field: string;
    homeGoals: number | null;
    awayGoals: number | null;
    callups: Record<string, boolean> | null;
    stats: Record<string, MatchStatLine>;
    katsuId: string | null;
    chronicle: string | null;
    photo: string | null;
    fantasy: FantasySaved | null;
};
export type HubPlayer = { id: string; name: string; number: number | null; position?: string; injured?: boolean };
type Step = "convocatoria" | "resultado" | "estadisticas" | "katsu" | "cronica" | "foto";

const RECENT_MATCH_MS = 3 * 24 * 60 * 60 * 1000;

function isPlayed(match: HubMatch): boolean {
    return match.homeGoals !== null && match.awayGoals !== null;
}

// Partido que se abre al entrar: el jugado en los últimos días (para completar resultado,
// estadísticas, KATSU…) o, si no hay, el siguiente sin resultado.
function defaultMatchId(matches: HubMatch[]): string {
    const now = Date.now();
    const started = matches.filter((match) => match.kickoff && Date.parse(match.kickoff) <= now);
    const recent = started.filter((match) => now - Date.parse(match.kickoff!) < RECENT_MATCH_MS).at(-1);
    const pending = matches.find((match) => !isPlayed(match));
    return (recent ?? pending ?? matches.at(-1))?.id ?? "";
}

// Primer paso pendiente del partido, que se abre desplegado.
function nextStep(match: HubMatch): Step | null {
    const started = match.kickoff !== null && Date.parse(match.kickoff) <= Date.now();
    if (!match.callups) return "convocatoria";
    if (!isPlayed(match)) return started ? "resultado" : null;
    if (!Object.values(match.stats).some(hasStats)) return "estadisticas";
    if (!match.katsuId) return "katsu";
    if (!match.chronicle) return "cronica";
    return null;
}

function rivalLabel(match: HubMatch): string {
    return match.home === FEATURED_TEAM ? `vs ${match.away}` : `en ${match.home}`;
}

function Panel({ title, status, done, open, children }: { title: string; status: string; done: boolean; open: boolean; children: ReactNode }) {
    return (
        <details open={open} className="group border border-[var(--line)] bg-[var(--ink)]/40">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${done ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)]"}`}>
                    {done ? <Check size={13} strokeWidth={3} /> : null}
                </span>
                <span className="shrink-0 text-sm font-black uppercase">{title}</span>
                <span className="ml-auto min-w-0 truncate text-right text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{status}</span>
            </summary>
            <div className="border-t border-[var(--line)] p-4">{children}</div>
        </details>
    );
}

function MatchPanels({ competitionId, match, players }: { competitionId: string; match: HubMatch; players: HubPlayer[] }) {
    const [openStep] = useState(() => nextStep(match));
    const calledUp = match.callups ? new Set(Object.entries(match.callups).filter(([, value]) => value).map(([id]) => id)) : null;
    const convocados = calledUp ? players.filter((player) => calledUp.has(player.id)) : [];
    const withStats = Object.values(match.stats).filter(hasStats).length;
    const teamGoals = match.home === FEATURED_TEAM ? match.homeGoals : match.awayGoals;
    const katsu = players.find((player) => player.id === match.katsuId);
    const conceded = isPlayed(match) ? (match.home === FEATURED_TEAM ? match.awayGoals : match.homeGoals) : null;
    const fantasyRows = match.fantasy ? Object.keys(match.fantasy.rows).length : 0;
    const fantasyDone = Boolean(match.fantasy && (fantasyRows || match.fantasy.doublePenaltiesAgainst));

    return (
        <div className="space-y-2">
            <Panel title="Convocatoria" open={openStep === "convocatoria"} done={Boolean(calledUp)} status={calledUp ? `${calledUp.size} convocados` : "Sin publicar"}>
                <AdminCallupForm match={match} players={players} />
            </Panel>
            <Panel title="Resultado" open={openStep === "resultado"} done={isPlayed(match)} status={isPlayed(match) ? `${match.homeGoals} - ${match.awayGoals}` : "Sin resultado"}>
                <AdminResultsEditor competitionId={competitionId} matches={[match]} />
            </Panel>
            <Panel title="Estadísticas" open={openStep === "estadisticas"} done={withStats > 0} status={withStats ? `${withStats} con datos` : "Sin datos"}>
                <AdminMatchStats matchId={match.id} players={convocados} saved={match.stats} teamGoals={teamGoals} />
            </Panel>
            <Panel title="KATSU" open={openStep === "katsu"} done={Boolean(match.katsuId)} status={katsu?.name ?? (match.katsuId ? "Elegido" : "Sin elegir")}>
                <AdminKatsuPicker matchId={match.id} playerId={match.katsuId} players={players} calledUp={calledUp} />
            </Panel>
            <Panel title="Fantasy" open={false} done={fantasyDone} status={match.fantasy ? (fantasyDone ? "Revisado" : "Sin revisar") : "Falta migración"}>
                <AdminMatchFantasy matchId={match.id} players={players} calledUp={calledUp} stats={match.stats} katsuId={match.katsuId} conceded={conceded} saved={match.fantasy} />
            </Panel>
            <Panel title="Crónica" open={openStep === "cronica"} done={Boolean(match.chronicle)} status={match.chronicle ? "Escrita" : "Sin crónica"}>
                <AdminMatchChronicle matchId={match.id} chronicle={match.chronicle} />
            </Panel>
            <Panel title="Foto" open={false} done={Boolean(match.photo)} status={match.photo ? "Con foto" : "Sin foto"}>
                <AdminMatchPhoto matchId={match.id} jornada={match.jornada} photo={match.photo} />
            </Panel>
        </div>
    );
}

// Todo lo de un partido del Bayern en un sitio: convocatoria → resultado → estadísticas → KATSU → fantasy → crónica → foto.
export function AdminMatchHub({ competitionId, matches, players }: { competitionId: string; matches: HubMatch[]; players: HubPlayer[] }) {
    const [matchId, setMatchId] = useState(() => defaultMatchId(matches));
    const index = matches.findIndex((match) => match.id === matchId);
    const match = matches[index];

    if (!match) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No hay partidos del Bayern cargados en esta competición.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <button type="button" aria-label="Partido anterior" disabled={index <= 0} onClick={() => setMatchId(matches[index - 1].id)} className="grid size-11 shrink-0 place-items-center border border-[var(--line)] disabled:opacity-30"><ChevronLeft size={16} /></button>
                <select value={matchId} onChange={(event) => setMatchId(event.target.value)} aria-label="Partido" className="min-h-11 min-w-0 flex-1 border border-[var(--line)] bg-[var(--ink)] px-3 text-sm text-white focus:border-[var(--lime)] focus:outline-none">
                    {matches.map((item) => (
                        <option key={item.id} value={item.id}>J{item.jornada} · {rivalLabel(item)}{isPlayed(item) ? ` · ${item.homeGoals}-${item.awayGoals}` : ""}</option>
                    ))}
                </select>
                <button type="button" aria-label="Partido siguiente" disabled={index >= matches.length - 1} onClick={() => setMatchId(matches[index + 1].id)} className="grid size-11 shrink-0 place-items-center border border-[var(--line)] disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>

            <div className="border border-[var(--lime)]/40 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">Jornada {match.jornada} · {match.scheduleLabel}</p>
                <p className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-sm font-black">
                    <span className="truncate text-right">{match.home}</span>
                    <span className="font-mono text-lg">{isPlayed(match) ? `${match.homeGoals} - ${match.awayGoals}` : "vs"}</span>
                    <span className="truncate">{match.away}</span>
                </p>
            </div>

            <MatchPanels key={match.id} competitionId={competitionId} match={match} players={players} />
        </div>
    );
}
