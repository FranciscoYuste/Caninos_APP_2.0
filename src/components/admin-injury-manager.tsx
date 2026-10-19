"use client";

import { useState } from "react";
import { Ambulance, Check, Cross } from "lucide-react";

type InjuryPlayer = { id: string; name: string; number: number | null; injured: boolean; injuryDescription: string | null };
type SaveState = { busy: boolean; message: string; error: boolean };

export function AdminInjuryManager({ players }: { players: InjuryPlayer[] }) {
    const [injuryStates, setInjuryStates] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(players.map((player) => [player.id, player.injured])),
    );
    const [descriptions, setDescriptions] = useState<Record<string, string>>(() =>
        Object.fromEntries(players.map((player) => [player.id, player.injuryDescription ?? ""])),
    );
    const [savedDescriptions, setSavedDescriptions] = useState<Record<string, string>>(() =>
        Object.fromEntries(players.map((player) => [player.id, player.injuryDescription ?? ""])),
    );
    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

    async function saveInjuryState(player: InjuryPlayer, injured: boolean) {
        const description = injured ? (descriptions[player.id] ?? player.injuryDescription ?? "").trim() : "";
        setSaveStates((previous) => ({
            ...previous,
            [player.id]: { busy: true, message: "", error: false },
        }));
        try {
            const response = await fetch("/api/admin/injuries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jugador_id: player.id, lesionado: injured, descripcion_lesion: description }),
            });
            const result = await response.json() as { error?: string; descripcion_lesion?: string | null };
            if (!response.ok) {
                setSaveStates((previous) => ({
                    ...previous,
                    [player.id]: { busy: false, message: result.error ?? "No se pudo actualizar el parte médico.", error: true },
                }));
                return;
            }
            setInjuryStates((previous) => ({ ...previous, [player.id]: injured }));
            const savedDescription = result.descripcion_lesion ?? "";
            setDescriptions((previous) => ({ ...previous, [player.id]: savedDescription }));
            setSavedDescriptions((previous) => ({ ...previous, [player.id]: savedDescription }));
            setSaveStates((previous) => ({
                ...previous,
                [player.id]: { busy: false, message: injured ? "Parte médico guardado." : "Jugador dado de alta.", error: false },
            }));
        } catch {
            setSaveStates((previous) => ({
                ...previous,
                [player.id]: { busy: false, message: "No se pudo conectar con el servidor.", error: true },
            }));
        }
    }

    function toggleInjury(player: InjuryPlayer) {
        const injured = !(injuryStates[player.id] ?? player.injured);
        void saveInjuryState(player, injured);
    }

    if (!players.length) {
        return <p className="mt-4 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No hay jugadores activos en la plantilla.</p>;
    }

    return (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {players.map((player) => {
                const injured = injuryStates[player.id] ?? player.injured;
                const state = saveStates[player.id] ?? { busy: false, message: "", error: false };
                const description = descriptions[player.id] ?? player.injuryDescription ?? "";
                const savedDescription = savedDescriptions[player.id] ?? player.injuryDescription ?? "";
                return (
                    <article key={player.id} className={`border p-4 transition-colors ${injured ? "border-red-300/40 bg-red-950/20" : "border-[var(--line)] bg-[var(--ink)]"}`}>
                        <div className="flex items-center gap-3">
                            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${injured ? "bg-red-600 text-white" : "bg-white/5 text-[var(--muted)]"}`}>
                                {injured ? <Cross size={19} strokeWidth={3} /> : <Ambulance size={19} />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold">{player.name}</span>
                                <span className="mt-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">#{player.number ?? "—"} · {injured ? "Lesionado" : "Disponible"}</span>
                            </span>
                            <button
                                type="button"
                                disabled={state.busy}
                                aria-pressed={injured}
                                onClick={() => toggleInjury(player)}
                                className={`min-h-10 shrink-0 px-3 text-[10px] font-black uppercase transition-colors disabled:opacity-50 ${injured ? "border border-red-300/50 text-red-200 hover:bg-red-500/20" : "bg-[var(--lime)] text-[var(--ink)] hover:bg-white"}`}
                            >
                                {state.busy ? "Guardando..." : injured ? "Dar de alta" : "Marcar lesión"}
                            </button>
                        </div>
                        {injured ? (
                            <div className="mt-4 border-t border-red-300/15 pt-3">
                                <label htmlFor={`injury-description-${player.id}`} className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-red-100/80">Descripción breve</label>
                                <textarea
                                    id={`injury-description-${player.id}`}
                                    value={description}
                                    maxLength={240}
                                    rows={2}
                                    onChange={(event) => setDescriptions((previous) => ({ ...previous, [player.id]: event.target.value }))}
                                    placeholder="Ej.: molestias en el tobillo; pendiente de evolución."
                                    className="w-full resize-y border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-xs leading-5 text-white placeholder:text-[var(--muted)] focus:border-[var(--lime)] focus:outline-none"
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="text-[9px] text-[var(--muted)]">{description.length}/240</span>
                                    <button
                                        type="button"
                                        disabled={state.busy || description.trim() === savedDescription}
                                        onClick={() => { void saveInjuryState(player, true); }}
                                        className="inline-flex min-h-9 items-center gap-1.5 border border-red-300/40 px-3 text-[10px] font-bold uppercase text-red-100 hover:bg-red-500/10 disabled:opacity-40"
                                    >
                                        <Check size={12} /> Guardar descripción
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {state.message ? <p role="status" className={`mt-3 flex items-center gap-1.5 text-[10px] ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{!state.error ? <Check size={12} /> : null}{state.message}</p> : null}
                    </article>
                );
            })}
        </div>
    );
}
