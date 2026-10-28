"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type ChronicleMatch = { id: string; jornada: number; home: string; away: string; chronicle: string | null };
type SaveState = { busy: boolean; message: string; error: boolean };

export function AdminMatchChronicleManager({ matches }: { matches: ChronicleMatch[] }) {
    const [drafts, setDrafts] = useState<Record<string, string>>(() =>
        Object.fromEntries(matches.map((match) => [match.id, match.chronicle ?? ""])),
    );
    const [savedChronicles, setSavedChronicles] = useState<Record<string, string>>(() =>
        Object.fromEntries(matches.map((match) => [match.id, match.chronicle ?? ""])),
    );
    const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

    async function saveChronicle(matchId: string) {
        const chronicle = drafts[matchId] ?? "";
        setSaveStates((previous) => ({
            ...previous,
            [matchId]: { busy: true, message: "", error: false },
        }));

        try {
            const response = await fetch("/api/admin/match-chronicle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partido_id: matchId, cronica: chronicle }),
            });
            const result = await response.json() as { error?: string };
            if (!response.ok) {
                setSaveStates((previous) => ({
                    ...previous,
                    [matchId]: { busy: false, message: result.error ?? "No se pudo guardar la crónica.", error: true },
                }));
                return;
            }
            setSavedChronicles((previous) => ({ ...previous, [matchId]: chronicle }));
            setSaveStates((previous) => ({
                ...previous,
                [matchId]: { busy: false, message: "Crónica guardada.", error: false },
            }));
        } catch {
            setSaveStates((previous) => ({
                ...previous,
                [matchId]: { busy: false, message: "No se pudo conectar con el servidor.", error: true },
            }));
        }
    }

    if (!matches.length) {
        return <p className="mt-4 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No hay partidos del Bayern para añadir crónicas.</p>;
    }

    return (
        <div className="mt-4 space-y-4">
            {matches.map((match) => {
                const state = saveStates[match.id] ?? { busy: false, message: "", error: false };
                const draft = drafts[match.id] ?? "";
                return (
                    <article key={match.id} className="border border-[var(--line)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Jornada {match.jornada}</p>
                        <h3 className="mt-1 text-sm font-bold">{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</h3>
                        <label htmlFor={`match-chronicle-${match.id}`} className="mb-2 mt-4 block text-[10px] font-semibold uppercase tracking-wide">Crónica del partido</label>
                        <textarea
                            id={`match-chronicle-${match.id}`}
                            value={draft}
                            maxLength={100000}
                            onChange={(event) => setDrafts((previous) => ({ ...previous, [match.id]: event.target.value }))}
                            placeholder={"Escribe la crónica del partido. Deja una línea en blanco entre párrafos."}
                            rows={8}
                            className="min-h-48 w-full resize-y border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-sm leading-6 text-white focus:border-[var(--lime)] focus:outline-none"
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[10px] text-[var(--muted)]">{draft.length.toLocaleString("es-ES")} / 100.000 caracteres · separa los párrafos con una línea en blanco</span>
                            <button
                                type="button"
                                disabled={state.busy || draft === (savedChronicles[match.id] ?? "")}
                                onClick={() => saveChronicle(match.id)}
                                className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-50"
                            >
                                <Check size={14} /> {state.busy ? "Guardando..." : "Guardar crónica"}
                            </button>
                        </div>
                        {state.message ? <p role="status" className={`mt-2 text-[10px] ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
                    </article>
                );
            })}
        </div>
    );
}
