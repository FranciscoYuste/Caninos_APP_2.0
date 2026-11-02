"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";
import { EMPTY_STAT_LINE, MATCH_STAT_FIELDS, hasStats, type MatchStatKey, type MatchStatLine } from "@/lib/players";

type StatsPlayer = { id: string; name: string; number: number | null };
type SaveState = { busy: boolean; message: string; error: boolean };

const IDLE: SaveState = { busy: false, message: "", error: false };
const MAIN_FIELDS = MATCH_STAT_FIELDS.slice(0, 4);
const EXTRA_FIELDS = MATCH_STAT_FIELDS.slice(4);

function sameLine(a: MatchStatLine, b: MatchStatLine): boolean {
    return MATCH_STAT_FIELDS.every(({ key }) => a[key] === b[key]);
}

// Mantiene marcados ≤ tirados al pulsar + o − en cualquiera de los dos.
function withChange(line: MatchStatLine, key: MatchStatKey, value: number): MatchStatLine {
    const next = { ...line, [key]: Math.max(0, Math.min(99, value)) };
    if (key === "penaltis_marcados") next.penaltis_tirados = Math.max(next.penaltis_tirados, next.penaltis_marcados);
    if (key === "penaltis_tirados") next.penaltis_marcados = Math.min(next.penaltis_marcados, next.penaltis_tirados);
    if (key === "dobles_penaltis_marcados") next.dobles_penaltis_tirados = Math.max(next.dobles_penaltis_tirados, next.dobles_penaltis_marcados);
    if (key === "dobles_penaltis_tirados") next.dobles_penaltis_marcados = Math.min(next.dobles_penaltis_marcados, next.dobles_penaltis_tirados);
    return next;
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return (
        <div className="min-w-0">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
            <div className="mt-1 flex items-center border border-[var(--line)]">
                <button type="button" aria-label={`Quitar ${label.toLowerCase()}`} disabled={value === 0} onClick={() => onChange(value - 1)} className="grid size-10 shrink-0 place-items-center text-[var(--muted)] hover:text-white disabled:opacity-30"><Minus size={14} /></button>
                <span aria-live="polite" className={`flex-1 text-center font-mono text-base font-black ${value ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>{value}</span>
                <button type="button" aria-label={`Añadir ${label.toLowerCase()}`} onClick={() => onChange(value + 1)} className="grid size-10 shrink-0 place-items-center text-white hover:text-[var(--lime)]"><Plus size={14} /></button>
            </div>
        </div>
    );
}

// Estadísticas de los convocados de un partido. Guardar sustituye todas las del partido.
export function AdminMatchStats({ matchId, players, saved, teamGoals }: { matchId: string; players: StatsPlayer[]; saved: Record<string, MatchStatLine>; teamGoals: number | null }) {
    const router = useRouter();
    const [drafts, setDrafts] = useState<Record<string, MatchStatLine>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [state, setState] = useState<SaveState>(IDLE);
    const signature = JSON.stringify(saved);
    const [seenSignature, setSeenSignature] = useState(signature);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setDrafts({});
    }

    if (!players.length) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Publica primero la convocatoria: solo se registran estadísticas de los convocados.</p>;
    }

    const lineOf = (id: string) => drafts[id] ?? saved[id] ?? EMPTY_STAT_LINE;
    const changedCount = players.filter((player) => drafts[player.id] && !sameLine(drafts[player.id], saved[player.id] ?? EMPTY_STAT_LINE)).length;
    const goals = players.reduce((total, player) => total + lineOf(player.id).goles, 0);
    const withData = players.filter((player) => hasStats(lineOf(player.id))).length;

    function change(id: string, key: MatchStatKey, value: number) {
        setDrafts((previous) => ({ ...previous, [id]: withChange(previous[id] ?? saved[id] ?? EMPTY_STAT_LINE, key, value) }));
        setState(IDLE);
    }

    async function save() {
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/match-stats", {
                partido_id: matchId,
                estadisticas: players.map((player) => ({ jugador_id: player.id, ...lineOf(player.id) })),
            });
            setState({ busy: false, message: `Estadísticas guardadas · ${withData} jugadores con datos.`, error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    let goalsNote: { text: string; error: boolean } | null = null;
    if (teamGoals !== null && goals > teamGoals) goalsNote = { text: `Hay ${goals} goles apuntados y el marcador dice ${teamGoals}.`, error: true };
    else if (teamGoals !== null && goals < teamGoals) goalsNote = { text: `Faltan ${teamGoals - goals} de ${teamGoals} goles por asignar (en propia puerta o sin autor, si es el caso).`, error: false };

    return (
        <div className="space-y-3">
            <ul className="space-y-2">
                {players.map((player) => {
                    const line = lineOf(player.id);
                    const isChanged = Boolean(drafts[player.id]) && !sameLine(line, saved[player.id] ?? EMPTY_STAT_LINE);
                    const showExtra = expanded[player.id] ?? EXTRA_FIELDS.some(({ key }) => line[key] > 0);
                    return (
                        <li key={player.id} className={`border p-3 ${isChanged ? "border-[var(--lime)]/70" : "border-[var(--line)]"}`}>
                            <p className="flex items-center gap-2 text-sm font-bold">
                                <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)]">{player.number ?? "—"}</span>
                                <span className="min-w-0 truncate">{player.name}</span>
                                {hasStats(line) ? <span className="ml-auto size-2 shrink-0 rounded-full bg-[var(--lime)]" aria-label="Con datos" /> : null}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {MAIN_FIELDS.map(({ key, label }) => <Stepper key={key} label={label} value={line[key]} onChange={(value) => change(player.id, key, value)} />)}
                            </div>
                            {showExtra ? (
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {EXTRA_FIELDS.map(({ key, label }) => <Stepper key={key} label={label} value={line[key]} onChange={(value) => change(player.id, key, value)} />)}
                                </div>
                            ) : (
                                <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, [player.id]: true }))} className="mt-2 min-h-9 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">+ Penaltis y faltas directas</button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {goalsNote ? <p className={`text-xs ${goalsNote.error ? "text-red-300" : "text-amber-200"}`}>{goalsNote.text}</p> : null}
            <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 bg-[var(--panel)] px-1 py-3">
                <button type="button" disabled={state.busy || !changedCount} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                    <Check size={15} /> {state.busy ? "Guardando..." : "Guardar estadísticas"}
                </button>
                {changedCount ? <button type="button" disabled={state.busy} onClick={() => setDrafts({})} className="min-h-11 px-2 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">Descartar</button> : null}
                {state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
            </div>
        </div>
    );
}
