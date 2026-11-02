"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type KatsuMatch = { id: string; jornada: number; home: string; away: string; score: string | null; playerId: string | null };
type KatsuPlayer = { id: string; name: string; number: number | null };
type SaveState = { busy: boolean; message: string; error: boolean };

export function AdminKatsuManager({ matches, players }: { matches: KatsuMatch[]; players: KatsuPlayer[] }) {
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [savedSelections, setSavedSelections] = useState<Record<string, string>>(() =>
        Object.fromEntries(matches.map((match) => [match.id, match.playerId ?? ""])),
    );
    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

    async function savePlayer(match: KatsuMatch) {
        const playerId = selections[match.id] ?? savedSelections[match.id] ?? "";
        setSaveStates((previous) => ({
            ...previous,
            [match.id]: { busy: true, message: "", error: false },
        }));

        try {
            const response = await fetch("/api/admin/katsu-player", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partido_id: match.id, jugador_id: playerId || null }),
            });
            const result = await response.json() as { error?: string };
            if (!response.ok) {
                setSaveStates((previous) => ({
                    ...previous,
                    [match.id]: { busy: false, message: result.error ?? "No se pudo guardar el jugador KATSU.", error: true },
                }));
                return;
            }
            setSelections((previous) => ({ ...previous, [match.id]: playerId }));
            setSavedSelections((previous) => ({ ...previous, [match.id]: playerId }));
            setSaveStates((previous) => ({
                ...previous,
                [match.id]: { busy: false, message: "Selección guardada.", error: false },
            }));
        } catch {
            setSaveStates((previous) => ({
                ...previous,
                [match.id]: { busy: false, message: "No se pudo conectar con el servidor.", error: true },
            }));
        }
    }

    if (!matches.length) {
        return <p className="mt-4 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No hay partidos del Bayern para gestionar en esta competición.</p>;
    }

    return (
        <div className="mt-4 space-y-3">
            {matches.map((match) => {
                const state = saveStates[match.id] ?? { busy: false, message: "", error: false };
                const selectedPlayer = selections[match.id] ?? savedSelections[match.id] ?? "";
                return (
                    <article key={match.id} className="grid gap-4 border border-[var(--line)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] sm:items-center">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Jornada {match.jornada}{match.score ? ` · ${match.score}` : ""}</p>
                            <h3 className="mt-1 text-sm font-bold">{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</h3>
                        </div>
                        <div>
                            <label htmlFor={`katsu-player-${match.id}`} className="mb-2 block text-[10px] font-semibold uppercase tracking-wide">Jugador KATSU</label>
                            <div className="flex gap-2">
                                <select
                                    id={`katsu-player-${match.id}`}
                                    value={selectedPlayer}
                                    onChange={(event) => setSelections((previous) => ({ ...previous, [match.id]: event.target.value }))}
                                    className="min-h-11 min-w-0 flex-1 border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-xs text-white focus:border-[var(--lime)] focus:outline-none"
                                >
                                    <option value="">Sin seleccionar</option>
                                    {players.map((player) => (
                                        <option key={player.id} value={player.id}>{player.number === null ? "—" : `#${player.number}`} · {player.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={state.busy || selectedPlayer === (savedSelections[match.id] ?? "")}
                                    onClick={() => savePlayer(match)}
                                    className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-50"
                                >
                                    <Check size={14} /> {state.busy ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                            {state.message ? <p role="status" className={`mt-2 text-[10px] ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
                        </div>
                    </article>
                );
            })}
            {!players.length ? <p className="text-xs text-amber-200">No hay jugadores activos para seleccionar.</p> : null}
        </div>
    );
}
