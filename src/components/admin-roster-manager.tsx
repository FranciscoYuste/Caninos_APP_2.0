"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2, UserMinus, UserPlus } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";
import { MAX_PLAYER_NAME_LENGTH, PLAYER_POSITIONS } from "@/lib/players";

export type RosterPlayer = { id: string; name: string; number: number | null; position: string; active: boolean };
type Draft = { name: string; number: string; position: string };
type SaveState = { busy: boolean; message: string; error: boolean };

const IDLE: SaveState = { busy: false, message: "", error: false };
const INPUT = "min-h-11 border border-[var(--line)] bg-[var(--ink)] px-3 text-sm text-white focus:border-[var(--lime)] focus:outline-none";

function savedDraft(player: RosterPlayer): Draft {
    return { name: player.name, number: player.number?.toString() ?? "", position: player.position };
}

function sameDraft(a: Draft, b: Draft): boolean {
    return a.name.trim() === b.name.trim() && a.number === b.number && a.position === b.position;
}

function asNumber(value: string): number | null {
    return value === "" ? null : Number(value);
}

function Status({ state }: { state: SaveState }) {
    return state.message ? <p role="status" className={`text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null;
}

// Plantilla común a todas las competiciones: nombre, dorsal y posición se editan juntos (así se
// pueden intercambiar dorsales), y los jugadores se dan de alta o de baja sin perder su historial.
export function AdminRosterManager({ players }: { players: RosterPlayer[] }) {
    const router = useRouter();
    const active = players.filter((player) => player.active);
    const inactive = players.filter((player) => !player.active);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [state, setState] = useState<SaveState>(IDLE);
    const [rowStates, setRowStates] = useState<Record<string, SaveState>>({});
    const [newPlayer, setNewPlayer] = useState<Draft>({ name: "", number: "", position: "Por definir" });
    const [createState, setCreateState] = useState<SaveState>(IDLE);
    const signature = JSON.stringify(players);
    const [seenSignature, setSeenSignature] = useState(signature);
    if (seenSignature !== signature) {
        setSeenSignature(signature);
        setDrafts({});
    }

    const draftOf = (player: RosterPlayer) => drafts[player.id] ?? savedDraft(player);
    const changed = active.filter((player) => drafts[player.id] && !sameDraft(drafts[player.id], savedDraft(player)));
    const numberCounts = new Map<string, number>();
    for (const player of active) {
        const number = draftOf(player).number;
        if (number) numberCounts.set(number, (numberCounts.get(number) ?? 0) + 1);
    }
    const duplicated = [...numberCounts].filter(([, count]) => count > 1).map(([number]) => number);
    const emptyName = changed.some((player) => !drafts[player.id].name.trim());

    function update(player: RosterPlayer, patch: Partial<Draft>) {
        setDrafts((previous) => ({ ...previous, [player.id]: { ...(previous[player.id] ?? savedDraft(player)), ...patch } }));
        setState(IDLE);
    }

    async function save() {
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/roster", {
                accion: "guardar",
                jugadores: changed.map((player) => {
                    const draft = drafts[player.id];
                    return { jugador_id: player.id, nombre: draft.name, dorsal: asNumber(draft.number), posicion: draft.position };
                }),
            });
            setState({ busy: false, message: `Plantilla guardada · ${changed.length} ${changed.length === 1 ? "jugador" : "jugadores"}.`, error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    async function rowAction(player: RosterPlayer, accion: "baja" | "alta" | "eliminar", question: string) {
        if (!window.confirm(question)) return;
        setRowStates((previous) => ({ ...previous, [player.id]: { busy: true, message: "", error: false } }));
        try {
            const result = await postAdmin<{ dorsal_liberado?: boolean; ocupante?: string }>("/api/admin/roster", { accion, jugador_id: player.id });
            const message = accion === "alta" && result.dorsal_liberado
                ? `${player.name} vuelve sin dorsal: el ${player.number} lo lleva ahora ${result.ocupante}.`
                : "";
            setRowStates((previous) => ({ ...previous, [player.id]: { busy: false, message, error: false } }));
            if (message) setState({ busy: false, message, error: false });
            router.refresh();
        } catch (error) {
            setRowStates((previous) => ({ ...previous, [player.id]: { busy: false, message: error instanceof Error ? error.message : "No se pudo completar.", error: true } }));
        }
    }

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/roster", { accion: "crear", nombre: newPlayer.name, dorsal: asNumber(newPlayer.number), posicion: newPlayer.position });
            setCreateState({ busy: false, message: `${newPlayer.name.trim()} añadido a la plantilla.`, error: false });
            setNewPlayer({ name: "", number: "", position: "Por definir" });
            router.refresh();
        } catch (error) {
            setCreateState({ busy: false, message: error instanceof Error ? error.message : "No se pudo añadir.", error: true });
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <ul className="space-y-2">
                    {active.map((player) => {
                        const draft = draftOf(player);
                        const isChanged = changed.includes(player);
                        const isDuplicated = Boolean(draft.number) && duplicated.includes(draft.number);
                        const rowState = rowStates[player.id] ?? IDLE;
                        return (
                            <li key={player.id} className={`border p-2 ${isChanged ? "border-[var(--lime)]/70" : "border-[var(--line)]"}`}>
                                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_10rem_auto]">
                                    <input aria-label={`Dorsal de ${player.name}`} inputMode="numeric" pattern="[0-9]*" placeholder="#" value={draft.number} onChange={(event) => update(player, { number: event.target.value.replace(/\D/g, "").slice(0, 2) })} className={`${INPUT} text-center font-mono font-bold ${isDuplicated ? "border-red-400 text-red-200" : ""}`} />
                                    <input aria-label="Nombre" value={draft.name} maxLength={MAX_PLAYER_NAME_LENGTH} onChange={(event) => update(player, { name: event.target.value })} className={`${INPUT} min-w-0 font-semibold`} />
                                    <select aria-label={`Posición de ${player.name}`} value={draft.position} onChange={(event) => update(player, { position: event.target.value })} className={`${INPUT} order-last col-span-3 min-w-0 sm:order-none sm:col-span-1`}>
                                        {PLAYER_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                                    </select>
                                    <button type="button" disabled={rowState.busy} onClick={() => rowAction(player, "baja", `¿Dar de baja a ${player.name}? Seguirá apareciendo en las competiciones en las que fue convocado.`)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line)] px-3 text-[10px] font-bold uppercase text-[var(--muted)] hover:border-red-300 hover:text-red-200 disabled:opacity-50">
                                        <UserMinus size={14} /> Baja
                                    </button>
                                </div>
                                {rowState.message ? <div className="mt-2"><Status state={rowState} /></div> : null}
                            </li>
                        );
                    })}
                </ul>
                {duplicated.length ? <p className="mt-3 text-xs text-red-300">Dorsal repetido: {duplicated.join(", ")}. Cada jugador activo necesita un número distinto (o ninguno).</p> : null}
                <div className="sticky bottom-0 mt-3 flex flex-wrap items-center gap-3 bg-[var(--panel)] py-3">
                    <button type="button" disabled={state.busy || !changed.length || duplicated.length > 0 || emptyName} onClick={save} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                        <Check size={15} /> {state.busy ? "Guardando..." : changed.length ? `Guardar ${changed.length} ${changed.length === 1 ? "cambio" : "cambios"}` : "Guardar plantilla"}
                    </button>
                    {changed.length ? <button type="button" disabled={state.busy} onClick={() => setDrafts({})} className="min-h-11 px-2 text-[10px] font-bold uppercase text-[var(--muted)] hover:text-white">Descartar</button> : null}
                    <Status state={state} />
                </div>
            </div>

            <form onSubmit={create} className="border border-dashed border-[var(--line)] p-3">
                <p className="text-xs font-black uppercase">Añadir jugador</p>
                <div className="mt-3 grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_10rem_auto]">
                    <input aria-label="Dorsal" inputMode="numeric" pattern="[0-9]*" placeholder="#" value={newPlayer.number} onChange={(event) => setNewPlayer((previous) => ({ ...previous, number: event.target.value.replace(/\D/g, "").slice(0, 2) }))} className={`${INPUT} text-center font-mono font-bold`} />
                    <input aria-label="Nombre" required placeholder="Nombre" value={newPlayer.name} maxLength={MAX_PLAYER_NAME_LENGTH} onChange={(event) => setNewPlayer((previous) => ({ ...previous, name: event.target.value }))} className={`${INPUT} min-w-0`} />
                    <select aria-label="Posición" value={newPlayer.position} onChange={(event) => setNewPlayer((previous) => ({ ...previous, position: event.target.value }))} className={`${INPUT} order-last col-span-3 min-w-0 sm:order-none sm:col-span-1`}>
                        {PLAYER_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                    </select>
                    <button disabled={createState.busy || !newPlayer.name.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--lime)] px-4 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-50">
                        <UserPlus size={15} /> {createState.busy ? "Añadiendo..." : "Añadir"}
                    </button>
                </div>
                <div className="mt-2"><Status state={createState} /></div>
            </form>

            {inactive.length ? (
                <details className="border border-[var(--line)]">
                    <summary className="cursor-pointer list-none p-3 text-xs font-black uppercase marker:hidden">Jugadores de baja ({inactive.length})</summary>
                    <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                        {inactive.map((player) => {
                            const rowState = rowStates[player.id] ?? IDLE;
                            return (
                                <li key={player.id} className="p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--muted)]">{player.name} <span className="font-mono text-xs">#{player.number ?? "—"}</span></span>
                                        <button type="button" disabled={rowState.busy} onClick={() => rowAction(player, "alta", `¿Recuperar a ${player.name} en la plantilla?`)} className="inline-flex min-h-10 items-center gap-2 border border-[var(--lime)]/60 px-3 text-[10px] font-bold uppercase text-[var(--lime)] disabled:opacity-50"><RotateCcw size={13} /> Recuperar</button>
                                        <button type="button" disabled={rowState.busy} onClick={() => rowAction(player, "eliminar", `¿Eliminar a ${player.name} para siempre? Solo es posible si nunca fue convocado.`)} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] px-3 text-[10px] font-bold uppercase text-[var(--muted)] hover:border-red-300 hover:text-red-200 disabled:opacity-50"><Trash2 size={13} /> Eliminar</button>
                                    </div>
                                    {rowState.message ? <div className="mt-2"><Status state={rowState} /></div> : null}
                                </li>
                            );
                        })}
                    </ul>
                </details>
            ) : null}
        </div>
    );
}
