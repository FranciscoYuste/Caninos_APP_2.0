"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";

type KatsuPlayer = { id: string; name: string; number: number | null };
type SaveState = { busy: boolean; message: string; error: boolean };

// Jugador KATSU de un partido. Si hay convocatoria, los convocados aparecen primero.
export function AdminKatsuPicker({ matchId, playerId, players, calledUp }: { matchId: string; playerId: string | null; players: KatsuPlayer[]; calledUp: Set<string> | null }) {
    const router = useRouter();
    const [selected, setSelected] = useState(playerId ?? "");
    const [saved, setSaved] = useState(playerId ?? "");
    const [state, setState] = useState<SaveState>({ busy: false, message: "", error: false });
    const label = (player: KatsuPlayer) => `${player.number === null ? "—" : `#${player.number}`} · ${player.name}`;
    const convocados = calledUp ? players.filter((player) => calledUp.has(player.id)) : [];
    const others = calledUp ? players.filter((player) => !calledUp.has(player.id)) : players;

    async function save() {
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/katsu-player", { partido_id: matchId, jugador_id: selected || null });
            setSaved(selected);
            setState({ busy: false, message: "Selección guardada.", error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar el jugador KATSU.", error: true });
        }
    }

    return (
        <div>
            <label htmlFor={`katsu-player-${matchId}`} className="mb-2 block text-[10px] font-semibold uppercase tracking-wide">Jugador KATSU</label>
            <div className="flex gap-2">
                <select
                    id={`katsu-player-${matchId}`}
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                    className="min-h-11 min-w-0 flex-1 border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-sm text-white focus:border-[var(--lime)] focus:outline-none"
                >
                    <option value="">Sin seleccionar</option>
                    {convocados.length ? (
                        <>
                            <optgroup label="Convocados">{convocados.map((player) => <option key={player.id} value={player.id}>{label(player)}</option>)}</optgroup>
                            {others.length ? <optgroup label="Resto de la plantilla">{others.map((player) => <option key={player.id} value={player.id}>{label(player)}</option>)}</optgroup> : null}
                        </>
                    ) : others.map((player) => <option key={player.id} value={player.id}>{label(player)}</option>)}
                </select>
                <button
                    type="button"
                    disabled={state.busy || selected === saved}
                    onClick={save}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-50"
                >
                    <Check size={14} /> {state.busy ? "Guardando..." : "Guardar"}
                </button>
            </div>
            {state.message ? <p role="status" className={`mt-2 text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
        </div>
    );
}
