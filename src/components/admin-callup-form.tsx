"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export type CallupFormMatch = {
    id: string;
    jornada: number;
    home: string;
    away: string;
    date: string;
    time: string;
    field: string;
    played: boolean;
    callups: Record<string, boolean> | null;
};
type CallupPlayer = { id: string; name: string; number: number | null };
type SaveState = { busy: boolean; message: string; error: boolean };

function initialSelection(match: CallupFormMatch | undefined, players: CallupPlayer[]): Record<string, boolean> {
    return Object.fromEntries(players.map((player) => [player.id, match?.callups?.[player.id] ?? false]));
}

export function AdminCallupForm({ matches: initialMatches, players }: { matches: CallupFormMatch[]; players: CallupPlayer[] }) {
    const [matches, setMatches] = useState(initialMatches);
    // Por defecto, el primer partido sin resultado: normalmente el de esta semana.
    const [matchId, setMatchId] = useState(() => (initialMatches.find((match) => !match.played) ?? initialMatches.at(-1))?.id ?? "");
    const match = matches.find((item) => item.id === matchId);
    const [date, setDate] = useState(match?.date ?? "");
    const [time, setTime] = useState(match?.time ?? "");
    const [field, setField] = useState(match?.field ?? "");
    const [publishCallup, setPublishCallup] = useState(true);
    const [selection, setSelection] = useState(() => initialSelection(match, players));
    const [state, setState] = useState<SaveState>({ busy: false, message: "", error: false });
    const calledUpCount = Object.values(selection).filter(Boolean).length;

    function selectMatch(id: string) {
        const next = matches.find((item) => item.id === id);
        setMatchId(id);
        setDate(next?.date ?? "");
        setTime(next?.time ?? "");
        setField(next?.field ?? "");
        setPublishCallup(true);
        setSelection(initialSelection(next, players));
        setState({ busy: false, message: "", error: false });
    }

    async function save() {
        if (!match) return;
        if (Boolean(date) !== Boolean(time)) {
            setState({ busy: false, message: "Indica fecha y hora juntas, o deja ambas vacías.", error: true });
            return;
        }
        setState({ busy: true, message: "", error: false });
        try {
            const response = await fetch("/api/admin/callup-form", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partido_id: match.id,
                    fecha: date,
                    hora: time,
                    campo: field,
                    jugadores: publishCallup ? players.map((player) => ({ jugador_id: player.id, convocado: selection[player.id] ?? false })) : [],
                }),
            });
            const result = await response.json() as { error?: string };
            if (!response.ok) {
                setState({ busy: false, message: result.error ?? "No se pudo guardar la convocatoria.", error: true });
                return;
            }
            setMatches((previous) => previous.map((item) => item.id === match.id
                ? { ...item, date, time, field: field || item.field, callups: publishCallup ? { ...selection } : item.callups }
                : item));
            setState({
                busy: false,
                message: publishCallup ? `Convocatoria guardada · ${calledUpCount} convocados.` : "Horario guardado.",
                error: false,
            });
        } catch {
            setState({ busy: false, message: "No se pudo conectar con el servidor.", error: true });
        }
    }

    if (!matches.length || !match) {
        return <p className="mt-4 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No hay partidos del Bayern cargados.</p>;
    }

    return (
        <div className="mt-4 space-y-5">
            <label className="block text-[10px] font-semibold uppercase tracking-wide">
                Partido
                <select
                    value={matchId}
                    onChange={(event) => selectMatch(event.target.value)}
                    className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm normal-case tracking-normal text-white focus:border-[var(--lime)] focus:outline-none"
                >
                    {matches.map((item) => (
                        <option key={item.id} value={item.id}>
                            J{item.jornada} · {item.home} vs {item.away}{item.callups ? " · publicada" : ""}
                        </option>
                    ))}
                </select>
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
                <label className="block text-[10px] font-semibold uppercase tracking-wide">
                    Fecha
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm text-white [color-scheme:dark] focus:border-[var(--lime)] focus:outline-none" />
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wide">
                    Hora
                    <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm text-white [color-scheme:dark] focus:border-[var(--lime)] focus:outline-none" />
                </label>
                <label className="col-span-2 block text-[10px] font-semibold uppercase tracking-wide sm:col-span-1">
                    Campo
                    <input type="text" value={field} maxLength={120} onChange={(event) => setField(event.target.value)} placeholder="Pabellón, pista…" className="mt-2 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-3 text-sm text-white focus:border-[var(--lime)] focus:outline-none" />
                </label>
            </div>
            <p className="-mt-2 text-[10px] text-[var(--muted)]">Deja fecha y hora vacías si aún no se conocen. El campo vacío conserva el que ya hubiera.</p>

            <div>
                <label className="flex items-center gap-3 text-xs font-semibold">
                    <input type="checkbox" checked={publishCallup} onChange={(event) => setPublishCallup(event.target.checked)} className="size-5 accent-[var(--lime)]" />
                    Publicar la lista de convocados
                </label>
                {publishCallup ? (
                    <>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Convocados · {calledUpCount} / {players.length}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelection(Object.fromEntries(players.map((player) => [player.id, true])))} className="min-h-10 border border-[var(--line)] px-3 text-[10px] font-bold uppercase hover:border-[var(--lime)]">Todos</button>
                                <button type="button" onClick={() => setSelection(Object.fromEntries(players.map((player) => [player.id, false])))} className="min-h-10 border border-[var(--line)] px-3 text-[10px] font-bold uppercase hover:border-[var(--lime)]">Ninguno</button>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {players.map((player) => {
                                const calledUp = selection[player.id] ?? false;
                                return (
                                    <button
                                        key={player.id}
                                        type="button"
                                        aria-pressed={calledUp}
                                        onClick={() => setSelection((previous) => ({ ...previous, [player.id]: !calledUp }))}
                                        className={`flex min-h-12 items-center gap-2 border px-3 text-left text-xs font-semibold transition ${calledUp ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)]"}`}
                                    >
                                        <span className="w-6 shrink-0 font-mono text-[10px]">{player.number ?? "—"}</span>
                                        <span className="min-w-0 truncate">{player.name}</span>
                                        {calledUp ? <Check size={14} className="ml-auto shrink-0" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : <p className="mt-2 text-[10px] text-[var(--muted)]">Solo se guardarán la fecha, la hora y el campo. La convocatoria publicada no cambia.</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={state.busy} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">
                    <Check size={15} /> {state.busy ? "Guardando..." : "Guardar convocatoria"}
                </button>
                {state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
            </div>
        </div>
    );
}
