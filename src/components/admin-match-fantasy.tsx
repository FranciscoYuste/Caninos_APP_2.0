"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Stepper } from "@/components/admin-match-stats";
import { postAdmin } from "@/lib/admin-request";
import { EMPTY_FANTASY_EXTRA, FANTASY_ABSENCES, formatPoints, scorePlayerMatch, type FantasyAbsence, type FantasyExtra } from "@/lib/fantasy";
import type { MatchStatLine } from "@/lib/players";

export type FantasySavedRow = FantasyExtra & { ausencia: FantasyAbsence | null; portero: boolean };
export type FantasySaved = { rows: Record<string, FantasySavedRow>; doublePenaltiesAgainst: number };
type FantasyPlayer = { id: string; name: string; number: number | null; position?: string; injured?: boolean };
type FantasyForm = { doublePenaltiesAgainst: number; keepers: string[]; extra: Record<string, FantasyExtra>; absences: Record<string, FantasyAbsence> };
type SaveState = { busy: boolean; message: string; error: boolean };

const IDLE: SaveState = { busy: false, message: "", error: false };
const EXTRA_FIELDS: Array<{ key: keyof FantasyExtra; label: string; keeper?: boolean }> = [
    { key: "penaltis_provocados", label: "Penaltis provocados" },
    { key: "penaltis_cometidos", label: "Penaltis cometidos" },
    { key: "penaltis_cometidos_gol", label: "Cometidos que fueron gol" },
    { key: "goles_propia", label: "Goles en propia" },
    { key: "penaltis_parados", label: "Penaltis parados", keeper: true },
    { key: "dobles_penaltis_parados", label: "Dobles penaltis parados", keeper: true },
];

function hasExtra(extra: FantasyExtra | undefined): boolean {
    return Boolean(extra && Object.values(extra).some((value) => value > 0));
}

// Lo que ya sale de las estadísticas del partido, para verlo junto a los puntos.
function statsSummary(line: MatchStatLine | undefined, katsu: boolean): string {
    const parts: string[] = [];
    const add = (count: number, one: string, many: string) => { if (count > 0) parts.push(`${count} ${count === 1 ? one : many}`); };
    if (line) {
        add(line.goles, "gol", "goles");
        add(line.asistencias, "asistencia", "asistencias");
        if (line.penaltis_tirados) parts.push(`penaltis ${line.penaltis_marcados}/${line.penaltis_tirados}`);
        if (line.dobles_penaltis_tirados) parts.push(`dobles penaltis ${line.dobles_penaltis_marcados}/${line.dobles_penaltis_tirados}`);
        add(line.amarillas, "amarilla", "amarillas");
        add(line.rojas, "roja", "rojas");
    }
    if (katsu) parts.push("KATSU");
    return parts.length ? parts.join(" · ") : "Sin estadísticas";
}

// Formulario tal como está guardado; con defaults = true, además rellena lo que se suele marcar
// (los lesionados no convocados, como ausencia justificada).
function formFrom(saved: FantasySaved, convocados: FantasyPlayer[], absent: FantasyPlayer[], defaults: boolean): FantasyForm {
    const marked = convocados.filter((player) => saved.rows[player.id]?.portero).map((player) => player.id);
    return {
        doublePenaltiesAgainst: saved.doublePenaltiesAgainst,
        keepers: marked.length ? marked : convocados.filter((player) => player.position === "Portero").map((player) => player.id),
        extra: Object.fromEntries(convocados.map((player) => {
            const row = saved.rows[player.id];
            return [player.id, row ? Object.fromEntries(Object.keys(EMPTY_FANTASY_EXTRA).map((key) => [key, row[key as keyof FantasyExtra]])) as FantasyExtra : EMPTY_FANTASY_EXTRA];
        })),
        absences: Object.fromEntries(absent.map((player) => [
            player.id,
            saved.rows[player.id]?.ausencia ?? (defaults && player.injured ? "justificada" : "injustificada"),
        ])),
    };
}

// Paso «Fantasy» de un partido: lo que sale de las estadísticas se ve solo; aquí se añade lo que no
// está en ellas (ausencias, portero, penaltis provocados/cometidos/parados, propia, dobles penaltis en contra).
export function AdminMatchFantasy({ matchId, players, calledUp, stats, katsuId, conceded, saved }: {
    matchId: string;
    players: FantasyPlayer[];
    calledUp: Set<string> | null;
    stats: Record<string, MatchStatLine>;
    katsuId: string | null;
    conceded: number | null;
    saved: FantasySaved | null;
}) {
    const router = useRouter();
    const convocados = calledUp ? players.filter((player) => calledUp.has(player.id)) : [];
    const absent = calledUp ? players.filter((player) => !calledUp.has(player.id)) : [];
    const signature = JSON.stringify(saved);
    const [seenSignature, setSeenSignature] = useState(signature);
    const [form, setForm] = useState<FantasyForm | null>(() => saved ? formFrom(saved, convocados, absent, true) : null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [state, setState] = useState<SaveState>(IDLE);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setForm(saved ? formFrom(saved, convocados, absent, true) : null);
    }

    if (!saved || !form) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Falta aplicar en Supabase la migración del fantasy (202611040001_fantasy.sql).</p>;
    }
    if (!calledUp) {
        return <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Publica primero la convocatoria: el fantasy puntúa a los convocados y las ausencias.</p>;
    }

    const stored = JSON.stringify(formFrom(saved, convocados, absent, false));
    const dirty = JSON.stringify(form) !== stored;
    const update = (change: (previous: FantasyForm) => FantasyForm) => {
        setForm((previous) => previous && change(previous));
        setState(IDLE);
    };
    function changeExtra(id: string, key: keyof FantasyExtra, value: number) {
        update((previous) => {
            const next = { ...previous.extra[id], [key]: Math.max(0, Math.min(99, value)) };
            if (key === "penaltis_cometidos_gol") next.penaltis_cometidos = Math.max(next.penaltis_cometidos, next.penaltis_cometidos_gol);
            if (key === "penaltis_cometidos") next.penaltis_cometidos_gol = Math.min(next.penaltis_cometidos_gol, next.penaltis_cometidos);
            return { ...previous, extra: { ...previous.extra, [id]: next } };
        });
    }
    const pointsOf = (player: FantasyPlayer) => conceded === null ? null : scorePlayerMatch({
        calledUp: true,
        goalkeeper: form.keepers.includes(player.id),
        katsu: katsuId === player.id,
        conceded,
        doublePenaltiesAgainst: form.doublePenaltiesAgainst,
        stats: stats[player.id] ?? null,
        extra: form.extra[player.id],
    }).total;

    async function save() {
        if (!form) return;
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/match-fantasy", {
                partido_id: matchId,
                dobles_penaltis_en_contra: form.doublePenaltiesAgainst,
                jugadores: [
                    ...convocados.map((player) => ({ jugador_id: player.id, ausencia: null, portero: form.keepers.includes(player.id), ...form.extra[player.id] })),
                    ...absent.map((player) => ({ jugador_id: player.id, ausencia: form.absences[player.id], portero: false, ...EMPTY_FANTASY_EXTRA })),
                ],
            });
            setState({ busy: false, message: "Fantasy guardado.", error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-xs leading-5 text-[var(--muted)]">Goles, asistencias, penaltis tirados, tarjetas, KATSU y goles encajados salen solos de lo ya guardado. Aquí solo se añade lo que no está en las estadísticas.</p>
            {conceded === null ? <p className="text-xs text-amber-200">Guarda el resultado para ver los puntos de cada jugador.</p> : null}

            <div className="max-w-56">
                <Stepper label="Dobles penaltis en contra" value={form.doublePenaltiesAgainst} onChange={(value) => update((previous) => ({ ...previous, doublePenaltiesAgainst: Math.max(0, Math.min(99, value)) }))} />
            </div>

            <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">Convocados</h4>
                <ul className="mt-2 space-y-2">
                    {convocados.map((player) => {
                        const keeper = form.keepers.includes(player.id);
                        const points = pointsOf(player);
                        const fields = EXTRA_FIELDS.filter((field) => !field.keeper || keeper);
                        const open = expanded[player.id] ?? (keeper || hasExtra(form.extra[player.id]));
                        return (
                            <li key={player.id} className="border border-[var(--line)] p-3">
                                <p className="flex items-center gap-2 text-sm font-bold">
                                    <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)]">{player.number ?? "—"}</span>
                                    <span className="min-w-0 truncate">{player.name}</span>
                                    {points !== null ? <span className={`ml-auto shrink-0 font-mono text-base font-black ${points > 0 ? "text-[var(--lime)]" : points < 0 ? "text-rose-400" : "text-[var(--muted)]"}`}>{formatPoints(points)}</span> : null}
                                </p>
                                <p className="mt-1 pl-9 text-[11px] text-[var(--muted)]">{statsSummary(stats[player.id], katsuId === player.id)}</p>
                                <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold uppercase">
                                    <input type="checkbox" checked={keeper} onChange={(event) => update((previous) => ({ ...previous, keepers: event.target.checked ? [...previous.keepers, player.id] : previous.keepers.filter((id) => id !== player.id) }))} className="size-4 accent-[var(--lime)]" />
                                    Jugó de portero
                                </label>
                                {open ? (
                                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {fields.map(({ key, label }) => <Stepper key={key} label={label} value={form.extra[player.id][key]} onChange={(value) => changeExtra(player.id, key, value)} />)}
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setExpanded((previous) => ({ ...previous, [player.id]: true }))} className="min-h-9 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">+ Penaltis y goles en propia</button>
                                )}
                            </li>
                        );
                    })}
                </ul>
                {!form.keepers.length ? <p className="mt-2 text-xs text-amber-200">Ningún convocado está marcado como portero.</p> : null}
            </div>

            {absent.length ? (
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">No fueron</h4>
                    <ul className="mt-2 divide-y divide-[var(--line)] border border-[var(--line)]">
                        {absent.map((player) => {
                            const absence = form.absences[player.id];
                            return (
                                <li key={player.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                                    <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)]">{player.number ?? "—"}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{player.name}{player.injured ? <span className="ml-2 text-[10px] font-bold uppercase text-amber-200">Lesionado</span> : null}</span>
                                    <select value={absence} aria-label={`Motivo de la ausencia de ${player.name}`} onChange={(event) => update((previous) => ({ ...previous, absences: { ...previous.absences, [player.id]: event.target.value as FantasyAbsence } }))} className="min-h-10 border border-[var(--line)] bg-[var(--ink)] px-2 text-xs text-white focus:border-[var(--lime)] focus:outline-none">
                                        {FANTASY_ABSENCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                    <span className={`w-8 shrink-0 text-right font-mono text-sm font-black ${absence === "injustificada" ? "text-rose-400" : "text-[var(--muted)]"}`}>{formatPoints(scorePlayerMatch({ calledUp: false, absence }).total)}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}

            <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 bg-[var(--panel)] px-1 py-3">
                <button type="button" disabled={state.busy || !dirty} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                    <Check size={15} /> {state.busy ? "Guardando..." : "Guardar fantasy"}
                </button>
                {dirty ? <button type="button" disabled={state.busy} onClick={() => setForm(JSON.parse(stored))} className="min-h-11 px-2 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">Descartar</button> : null}
                {state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
            </div>
        </div>
    );
}
