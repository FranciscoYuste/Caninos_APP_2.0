"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Pencil } from "lucide-react";
import { postAdmin } from "@/lib/admin-request";

type SaveState = { busy: boolean; message: string; error: boolean };

// Crónica de un partido. Guardarla vacía la quita de la página pública.
export function AdminMatchChronicle({ matchId, chronicle }: { matchId: string; chronicle: string | null }) {
    const router = useRouter();
    const [draft, setDraft] = useState(chronicle ?? "");
    const [saved, setSaved] = useState(chronicle ?? "");
    const [preview, setPreview] = useState(false);
    const [state, setState] = useState<SaveState>({ busy: false, message: "", error: false });

    async function save() {
        setState({ busy: true, message: "", error: false });
        try {
            await postAdmin("/api/admin/match-chronicle", { partido_id: matchId, cronica: draft });
            setSaved(draft);
            setState({ busy: false, message: "Crónica guardada.", error: false });
            router.refresh();
        } catch (error) {
            setState({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar la crónica.", error: true });
        }
    }

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={`match-chronicle-${matchId}`} className="block text-[10px] font-semibold uppercase tracking-wide">Crónica del partido</label>
                <button
                    type="button"
                    aria-pressed={preview}
                    onClick={() => setPreview((previous) => !previous)}
                    className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--line)] px-3 text-[10px] font-bold uppercase text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"
                >
                    {preview ? <><Pencil size={12} /> Editar</> : <><Eye size={12} /> Vista previa</>}
                </button>
            </div>
            {preview ? (
                // Mismo formato que la crónica pública: un párrafo por cada bloque separado por una línea en blanco.
                <div className="min-h-48 space-y-4 border border-[var(--lime)]/40 bg-[var(--ink)] px-4 py-3 text-sm leading-7 text-white/85">
                    {draft.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
                    ))}
                    {!draft.trim() ? <p className="text-xs text-[var(--muted)]">La crónica está vacía: no se mostrará en la web.</p> : null}
                </div>
            ) : (
                <textarea
                    id={`match-chronicle-${matchId}`}
                    value={draft}
                    maxLength={100000}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={"Escribe la crónica del partido. Deja una línea en blanco entre párrafos."}
                    rows={8}
                    className="min-h-48 w-full resize-y border border-[var(--line)] bg-[var(--ink)] px-3 py-2 text-sm leading-6 text-white focus:border-[var(--lime)] focus:outline-none"
                />
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-[var(--muted)]">{draft.length.toLocaleString("es-ES")} / 100.000 caracteres · separa los párrafos con una línea en blanco</span>
                <button
                    type="button"
                    disabled={state.busy || draft === saved}
                    onClick={save}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-50"
                >
                    <Check size={14} /> {state.busy ? "Guardando..." : "Guardar crónica"}
                </button>
            </div>
            {state.message ? <p role="status" className={`mt-2 text-xs ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
        </div>
    );
}
