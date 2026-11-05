"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";
import { EMPTY_FANTASY_EXTRA, FANTASY_ABSENCES, formatPoints, scorePlayerMatch, type FantasyAbsence, type FantasyExtra } from "@/lib/fantasy";
import { EMPTY_STAT_LINE, MATCH_STAT_FIELDS, hasStats, type MatchStatKey, type MatchStatLine } from "@/lib/players";

export type FantasySavedRow = FantasyExtra & { ausencia: FantasyAbsence | null; portero: boolean };
export type FantasySaved = { rows: Record<string, FantasySavedRow>; doublePenaltiesAgainst: number };
type MatchPlayer = { id: string; name: string; number: number | null; position?: string; injured?: boolean };
type FantasyForm = { doublePenaltiesAgainst: number; keepers: string[]; extra: Record<string, FantasyExtra>; absences: Record<string, FantasyAbsence> };
type Form = { stats: Record<string, MatchStatLine>; fantasy: FantasyForm | null };
type SaveState = { busy: boolean; message: string; error: boolean };

const IDLE: SaveState = { busy: false, message: "", error: false };
const MAIN_FIELDS = MATCH_STAT_FIELDS.slice(0, 4);
const EXTRA_STAT_FIELDS = MATCH_STAT_FIELDS.slice(4);
const FANTASY_KEYS = Object.keys(EMPTY_FANTASY_EXTRA) as Array<keyof FantasyExtra>;
const FANTASY_FIELDS: Array<{ key: keyof FantasyExtra; label: string; keeper?: boolean }> = [
    { key: "penaltis_provocados", label: "Penaltis provocados" },
    { key: "penaltis_cometidos", label: "Penaltis cometidos" },
    { key: "penaltis_cometidos_gol", label: "Cometidos que fueron gol" },
    { key: "goles_propia", label: "Goles en propia" },
    { key: "penaltis_parados", label: "Penaltis parados", keeper: true },
    { key: "dobles_penaltis_parados", label: "Dobles penaltis parados", keeper: true },
];

const clamp = (value: number) => Math.max(0, Math.min(99, value));

// Mantiene marcados ≤ tirados al pulsar + o − en cualquiera de los dos.
function withStatChange(line: MatchStatLine, key: MatchStatKey, value: number): MatchStatLine {
    const next = { ...line, [key]: clamp(value) };
    if (key === "penaltis_marcados") next.penaltis_tirados = Math.max(next.penaltis_tirados, next.penaltis_marcados);
    if (key === "penaltis_tirados") next.penaltis_marcados = Math.min(next.penaltis_marcados, next.penaltis_tirados);
    if (key === "dobles_penaltis_marcados") next.dobles_penaltis_tirados = Math.max(next.dobles_penaltis_tirados, next.dobles_penaltis_marcados);
    if (key === "dobles_penaltis_tirados") next.dobles_penaltis_marcados = Math.min(next.dobles_penaltis_marcados, next.dobles_penaltis_tirados);
    return next;
}

// Mantiene cometidos con gol ≤ cometidos.
function withExtraChange(extra: FantasyExtra, key: keyof FantasyExtra, value: number): FantasyExtra {
    const next = { ...extra, [key]: clamp(value) };
    if (key === "penaltis_cometidos_gol") next.penaltis_cometidos = Math.max(next.penaltis_cometidos, next.penaltis_cometidos_gol);
    if (key === "penaltis_cometidos") next.penaltis_cometidos_gol = Math.min(next.penaltis_cometidos_gol, next.penaltis_cometidos);
    return next;
}

function hasExtra(extra: FantasyExtra | undefined): boolean {
    return Boolean(extra && Object.values(extra).some((value) => value > 0));
}

export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
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

// Formulario tal como está guardado. Con defaults = true, si las ausencias del partido aún no se
// han revisado, propone como justificadas las de los lesionados.
function formFrom(stats: Record<string, MatchStatLine>, fantasy: FantasySaved | null, convocados: MatchPlayer[], absent: MatchPlayer[], defaults: boolean): Form {
    const statsForm = Object.fromEntries(convocados.map((player) => [player.id, { ...EMPTY_STAT_LINE, ...stats[player.id] }]));
    if (!fantasy) return { stats: statsForm, fantasy: null };
    const marked = convocados.filter((player) => fantasy.rows[player.id]?.portero).map((player) => player.id);
    const reviewed = absent.some((player) => fantasy.rows[player.id]?.ausencia);
    return {
        stats: statsForm,
        fantasy: {
            doublePenaltiesAgainst: fantasy.doublePenaltiesAgainst,
            keepers: marked.length ? marked : convocados.filter((player) => player.position === "Portero").map((player) => player.id),
            extra: Object.fromEntries(convocados.map((player) => {
                const row = fantasy.rows[player.id];
                return [player.id, Object.fromEntries(FANTASY_KEYS.map((key) => [key, row?.[key] ?? 0])) as FantasyExtra];
            })),
            absences: Object.fromEntries(absent.map((player) => [
                player.id,
                fantasy.rows[player.id]?.ausencia ?? (defaults && !reviewed && player.injured ? "justificada" : "injustificada"),
            ])),
        },
    };
}

function SectionLabel({ children, fantasy = false }: { children: string; fantasy?: boolean }) {
    return <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${fantasy ? "text-sky-300" : "text-[var(--lime)]"}`}>{children}</p>;
}

// Paso «Estadísticas y fantasy» de un partido. Cada convocado tiene dos bloques: Estadísticas (las que
// se ven en la web) y Fantasy (solo cuentan para los puntos: portero, penaltis provocados, cometidos y
// parados, goles en propia). Debajo, el fantasy del partido: dobles penaltis en contra y el motivo de
// cada ausencia. Un solo botón lo guarda todo y sustituye lo guardado del partido.
export function AdminMatchStats({ matchId, players, calledUp, stats, fantasy, teamGoals, conceded, katsuId }: {
    matchId: string;
    players: MatchPlayer[];
    calledUp: Set<string> | null;
    stats: Record<string, MatchStatLine>;
    fantasy: FantasySaved | null;
    teamGoals: number | null;
    conceded: number | null;
    katsuId: string | null;
}) {
    const router = useRouter();
    const convocados = calledUp ? players.filter((player) => calledUp.has(player.id)) : [];
    const absent = calledUp ? players.filter((player) => !calledUp.has(player.id)) : [];
    const signature = JSON.stringify([stats, fantasy, calledUp ? [...calledUp] : null]);
    const [seenSignature, setSeenSignature] = useState(signature);
    const [form, setForm] = useState<Form>(() => formFrom(stats, fantasy, convocados, absent, true));
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [state, setState] = useState<SaveState>(IDLE);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setForm(formFrom(stats, fantasy, convocados, absent, true));
    }

    if (!convocados.length) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Publica primero la convocatoria: solo se registran estadísticas y fantasy de los convocados.</p>;
    }

    const stored = JSON.stringify(formFrom(stats, fantasy, convocados, absent, false));
    const dirty = JSON.stringify(form) !== stored;
    const fantasyForm = form.fantasy;
    const goals = convocados.reduce((total, player) => total + form.stats[player.id].goles, 0);
    const withData = convocados.filter((player) => hasStats(form.stats[player.id])).length;

    const update = (change: (previous: Form) => Form) => {
        setForm(change);
        setState(IDLE);
    };
    const changeStat = (id: string, key: MatchStatKey, value: number) =>
        update((previous) => ({ ...previous, stats: { ...previous.stats, [id]: withStatChange(previous.stats[id], key, value) } }));
    const changeFantasy = (change: (previous: FantasyForm) => FantasyForm) =>
        update((previous) => previous.fantasy ? { ...previous, fantasy: change(previous.fantasy) } : previous);
    const expand = (key: string) => setExpanded((previous) => ({ ...previous, [key]: true }));

    const pointsOf = (player: MatchPlayer) => conceded === null || !fantasyForm ? null : scorePlayerMatch({
        calledUp: true,
        goalkeeper: fantasyForm.keepers.includes(player.id),
        katsu: katsuId === player.id,
        conceded,
        doublePenaltiesAgainst: fantasyForm.doublePenaltiesAgainst,
        stats: form.stats[player.id],
        extra: fantasyForm.extra[player.id],
    }).total;

    async function save() {
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/match-stats", {
                partido_id: matchId,
                estadisticas: convocados.map((player) => ({ jugador_id: player.id, ...form.stats[player.id] })),
                fantasy: fantasyForm ? {
                    dobles_penaltis_en_contra: fantasyForm.doublePenaltiesAgainst,
                    jugadores: [
                        ...convocados.map((player) => ({ jugador_id: player.id, ausencia: null, portero: fantasyForm.keepers.includes(player.id), ...fantasyForm.extra[player.id] })),
                        ...absent.map((player) => ({ jugador_id: player.id, ausencia: fantasyForm.absences[player.id], portero: false, ...EMPTY_FANTASY_EXTRA })),
                    ],
                } : undefined,
            });
            setState({ busy: false, message: `Guardado · ${withData} jugadores con estadísticas${fantasyForm ? " y fantasy revisado" : ""}.`, error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    let goalsNote: { text: string; error: boolean } | null = null;
    if (teamGoals !== null && goals > teamGoals) goalsNote = { text: `Hay ${goals} goles apuntados y el marcador dice ${teamGoals}.`, error: true };
    else if (teamGoals !== null && goals < teamGoals) goalsNote = { text: `Faltan ${teamGoals - goals} de ${teamGoals} goles por asignar (en propia puerta o sin autor, si es el caso).`, error: false };

    return (
        <div className="space-y-4">
            {!fantasyForm ? <p className="text-xs text-amber-200">Falta aplicar en Supabase la migración del fantasy (202611040001_fantasy.sql): de momento solo se guardan las estadísticas.</p> : null}
            {fantasyForm && conceded === null ? <p className="text-xs text-amber-200">Guarda el resultado para ver los puntos fantasy de cada jugador.</p> : null}

            <ul className="space-y-2">
                {convocados.map((player) => {
                    const line = form.stats[player.id];
                    const points = pointsOf(player);
                    const keeper = Boolean(fantasyForm?.keepers.includes(player.id));
                    const extra = fantasyForm?.extra[player.id];
                    const showExtraStats = expanded[`s:${player.id}`] ?? EXTRA_STAT_FIELDS.some(({ key }) => line[key] > 0);
                    const showFantasy = expanded[`f:${player.id}`] ?? (keeper || hasExtra(extra));
                    return (
                        <li key={player.id} className="border border-[var(--line)] p-3">
                            <p className="flex items-center gap-2 text-sm font-bold">
                                <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)]">{player.number ?? "—"}</span>
                                <span className="min-w-0 truncate">{player.name}</span>
                                {katsuId === player.id ? <span className="shrink-0 text-[10px] font-bold uppercase text-[var(--lime)]">KATSU</span> : null}
                                {points !== null ? <span className={`ml-auto shrink-0 font-mono text-base font-black ${points > 0 ? "text-[var(--lime)]" : points < 0 ? "text-rose-400" : "text-[var(--muted)]"}`} title="Puntos fantasy">{formatPoints(points)}</span> : null}
                            </p>

                            <div className="mt-3">
                                <SectionLabel>Estadísticas</SectionLabel>
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {MAIN_FIELDS.map(({ key, label }) => <Stepper key={key} label={label} value={line[key]} onChange={(value) => changeStat(player.id, key, value)} />)}
                                </div>
                                {showExtraStats ? (
                                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {EXTRA_STAT_FIELDS.map(({ key, label }) => <Stepper key={key} label={label} value={line[key]} onChange={(value) => changeStat(player.id, key, value)} />)}
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => expand(`s:${player.id}`)} className="mt-1 min-h-9 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">+ Penaltis y faltas directas</button>
                                )}
                            </div>

                            {fantasyForm && extra ? (
                                <div className="mt-3 border-t border-dashed border-[var(--line)] pt-3">
                                    <SectionLabel fantasy>Fantasy</SectionLabel>
                                    <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold uppercase">
                                        <input type="checkbox" checked={keeper} onChange={(event) => changeFantasy((previous) => ({ ...previous, keepers: event.target.checked ? [...previous.keepers, player.id] : previous.keepers.filter((id) => id !== player.id) }))} className="size-4 accent-sky-300" />
                                        Jugó de portero
                                    </label>
                                    {showFantasy ? (
                                        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {FANTASY_FIELDS.filter((field) => !field.keeper || keeper).map(({ key, label }) => (
                                                <Stepper key={key} label={label} value={extra[key]} onChange={(value) => changeFantasy((previous) => ({ ...previous, extra: { ...previous.extra, [player.id]: withExtraChange(previous.extra[player.id], key, value) } }))} />
                                            ))}
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => expand(`f:${player.id}`)} className="min-h-9 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">+ Penaltis provocados, cometidos y en propia</button>
                                    )}
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {goalsNote ? <p className={`text-xs ${goalsNote.error ? "text-red-300" : "text-amber-200"}`}>{goalsNote.text}</p> : null}

            {fantasyForm ? (
                <div className="space-y-3 border border-dashed border-[var(--line)] p-3">
                    <SectionLabel fantasy>Fantasy del partido</SectionLabel>
                    {!fantasyForm.keepers.length ? <p className="text-xs text-amber-200">Ningún convocado está marcado como portero.</p> : null}
                    <div className="max-w-56">
                        <Stepper label="Dobles penaltis en contra" value={fantasyForm.doublePenaltiesAgainst} onChange={(value) => changeFantasy((previous) => ({ ...previous, doublePenaltiesAgainst: clamp(value) }))} />
                    </div>
                    {absent.length ? (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">No fueron</p>
                            <ul className="mt-1 divide-y divide-[var(--line)] border border-[var(--line)]">
                                {absent.map((player) => {
                                    const absence = fantasyForm.absences[player.id];
                                    return (
                                        <li key={player.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                                            <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)]">{player.number ?? "—"}</span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{player.name}{player.injured ? <span className="ml-2 text-[10px] font-bold uppercase text-amber-200">Lesionado</span> : null}</span>
                                            <select value={absence} aria-label={`Motivo de la ausencia de ${player.name}`} onChange={(event) => changeFantasy((previous) => ({ ...previous, absences: { ...previous.absences, [player.id]: event.target.value as FantasyAbsence } }))} className="min-h-10 border border-[var(--line)] bg-[var(--ink)] px-2 text-xs text-white focus:border-[var(--lime)] focus:outline-none">
                                                {FANTASY_ABSENCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                            <span className={`w-8 shrink-0 text-right font-mono text-sm font-black ${absence === "injustificada" ? "text-rose-400" : "text-[var(--muted)]"}`}>{formatPoints(scorePlayerMatch({ calledUp: false, absence }).total)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 bg-[var(--panel)] px-1 py-3">
                <button type="button" disabled={state.busy || !dirty} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                    <Check size={15} /> {state.busy ? "Guardando..." : fantasyForm ? "Guardar estadísticas y fantasy" : "Guardar estadísticas"}
                </button>
                {dirty ? <button type="button" disabled={state.busy} onClick={() => setForm(JSON.parse(stored))} className="min-h-11 px-2 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">Descartar</button> : null}
                {state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
            </div>
        </div>
    );
}
