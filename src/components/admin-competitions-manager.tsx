"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Competition } from "@/lib/competition-data";
import { COMPETITION_PHASES, PHASE_LABELS } from "@/lib/competitions";

type Draft = { temporada: string; fase: string; grupo: string; nombre: string; slug: string; orden: number; estado: string };
type Status = { busy: boolean; message: string; error: boolean };

const STATUS_LABELS: Record<string, string> = { pendiente: "Pendiente", en_curso: "En curso", finalizada: "Finalizada" };
const inputClass = "mt-1 w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-2.5 text-sm text-white focus:border-[var(--lime)] focus:outline-none";
const labelClass = "block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]";

function slugify(value: string): string {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function toDraft(competition: Competition): Draft {
    return { temporada: competition.season, fase: competition.phase, grupo: competition.group, nombre: competition.name, slug: competition.slug, orden: competition.order, estado: competition.status };
}

async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/competitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la competición.");
}

function CompetitionFields({ draft, onChange, autoSlug }: { draft: Draft; onChange: (draft: Draft) => void; autoSlug: boolean }) {
    const update = (patch: Partial<Draft>) => {
        const next = { ...draft, ...patch };
        if (autoSlug && patch.nombre !== undefined) next.slug = slugify(patch.nombre);
        onChange(next);
    };
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className={`${labelClass} col-span-2`}>Nombre visible<input value={draft.nombre} maxLength={80} onChange={(event) => update({ nombre: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Temporada<input value={draft.temporada} placeholder="2027-2028" onChange={(event) => update({ temporada: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Estado
                <select value={draft.estado} onChange={(event) => update({ estado: event.target.value })} className={inputClass}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </label>
            <label className={`${labelClass} col-span-2`}>Tipo
                <select value={draft.fase} onChange={(event) => update({ fase: event.target.value })} className={inputClass}>
                    {COMPETITION_PHASES.map((phase) => <option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>)}
                </select>
            </label>
            <label className={labelClass}>Grupo<input value={draft.grupo} maxLength={80} placeholder="(ninguno)" onChange={(event) => update({ grupo: event.target.value })} className={inputClass} /></label>
            <label className={labelClass}>Orden<input type="number" min={0} max={99} value={draft.orden} onChange={(event) => update({ orden: Number(event.target.value) })} className={inputClass} /></label>
            <label className={`${labelClass} col-span-2 sm:col-span-4`}>Dirección web<input value={draft.slug} maxLength={60} onChange={(event) => update({ slug: event.target.value })} className={`${inputClass} font-mono`} /></label>
            <p className="col-span-2 -mt-1 text-[10px] text-[var(--muted)] sm:col-span-4">Quedará en <span className="font-mono">/{draft.temporada || "temporada"}/{draft.slug || "direccion"}</span></p>
        </div>
    );
}

function CompetitionEditor({ competition, managing }: { competition: Competition; managing: boolean }) {
    const router = useRouter();
    const [draft, setDraft] = useState(() => toDraft(competition));
    const [status, setStatus] = useState<Status>({ busy: false, message: "", error: false });

    async function run(action: "actualizar" | "eliminar") {
        if (action === "eliminar" && !window.confirm(`¿Eliminar «${competition.name} ${competition.season}»?`)) return;
        setStatus({ busy: true, message: "", error: false });
        try {
            await send(action === "eliminar" ? { accion: "eliminar", id: competition.id } : { accion: "actualizar", id: competition.id, ...draft });
            setStatus({ busy: false, message: action === "eliminar" ? "Competición eliminada." : "Cambios guardados.", error: false });
            router.refresh();
        } catch (error) {
            setStatus({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    return (
        <details className="border border-[var(--line)]">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-3 marker:hidden">
                <span className="text-sm font-bold">{competition.name} <span className="font-normal text-[var(--muted)]">· {competition.season}{competition.group ? ` · ${competition.group}` : ""}</span></span>
                <span className={`text-[10px] font-bold uppercase ${competition.status === "en_curso" ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>{STATUS_LABELS[competition.status]}{managing ? " · gestionando" : ""}</span>
            </summary>
            <div className="space-y-3 border-t border-[var(--line)] p-3">
                <CompetitionFields draft={draft} onChange={setDraft} autoSlug={false} />
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={status.busy} onClick={() => run("actualizar")} className="inline-flex min-h-10 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-60"><Check size={13} /> Guardar</button>
                    {!managing ? <Link href={`/admin?competicion=${competition.id}`} className="inline-flex min-h-10 items-center border border-[var(--line)] px-3 text-[10px] font-bold uppercase hover:border-[var(--lime)]">Gestionar</Link> : null}
                    <button type="button" disabled={status.busy} onClick={() => run("eliminar")} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] px-3 text-[10px] font-bold uppercase text-[var(--muted)] hover:border-red-300 hover:text-red-200 disabled:opacity-60"><Trash2 size={13} /> Eliminar</button>
                </div>
                {status.message ? <p role="status" className={`text-xs ${status.error ? "text-red-300" : "text-[var(--lime)]"}`}>{status.message}</p> : null}
            </div>
        </details>
    );
}

export function AdminCompetitionsManager({ competitions, managingId }: { competitions: Competition[]; managingId: string }) {
    const router = useRouter();
    const latestSeason = competitions[0]?.season ?? "";
    const emptyDraft = (): Draft => ({
        temporada: latestSeason,
        fase: "liga_campeones",
        grupo: "",
        nombre: "",
        slug: "",
        orden: Math.max(0, ...competitions.filter((item) => item.season === latestSeason).map((item) => item.order)) + 1,
        estado: "pendiente",
    });
    const [draft, setDraft] = useState(emptyDraft);
    const [status, setStatus] = useState<Status>({ busy: false, message: "", error: false });

    async function create() {
        setStatus({ busy: true, message: "", error: false });
        try {
            await send({ accion: "crear", ...draft });
            setStatus({ busy: false, message: "Competición creada. Ya puedes elegirla arriba para cargar su calendario.", error: false });
            setDraft(emptyDraft());
            router.refresh();
        } catch (error) {
            setStatus({ busy: false, message: error instanceof Error ? error.message : "No se pudo crear.", error: true });
        }
    }

    return (
        <div className="mt-4 space-y-6">
            <div className="space-y-2">
                {competitions.map((competition) => <CompetitionEditor key={`${competition.id}-${competition.name}-${competition.status}-${competition.slug}`} competition={competition} managing={competition.id === managingId} />)}
            </div>
            <div className="border border-dashed border-[var(--lime)]/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase"><Plus size={15} /> Nueva competición</h3>
                <CompetitionFields draft={draft} onChange={setDraft} autoSlug />
                <button type="button" disabled={status.busy || !draft.nombre.trim()} onClick={create} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-60"><Plus size={13} /> Crear competición</button>
                {status.message ? <p role="status" className={`mt-2 text-xs ${status.error ? "text-red-300" : "text-[var(--lime)]"}`}>{status.message}</p> : null}
            </div>
        </div>
    );
}
