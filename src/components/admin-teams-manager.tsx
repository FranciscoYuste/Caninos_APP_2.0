"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export type AdminTeam = { code: string; name: string };
type Status = { busy: boolean; message: string; error: boolean };

async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el equipo.");
}

export function AdminTeamsManager({ teams: initialTeams }: { teams: AdminTeam[] }) {
    const [teams, setTeams] = useState(initialTeams);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [status, setStatus] = useState<Status>({ busy: false, message: "", error: false });

    async function run(action: () => Promise<void>, done: string) {
        setStatus({ busy: true, message: "", error: false });
        try {
            await action();
            setStatus({ busy: false, message: done, error: false });
        } catch (error) {
            setStatus({ busy: false, message: error instanceof Error ? error.message : "No se pudo guardar.", error: true });
        }
    }

    const create = () => run(async () => {
        const team = { code: code.trim().toUpperCase(), name: name.trim() };
        await send({ accion: "crear", codigo: team.code, nombre: team.name });
        setTeams((previous) => [...previous, team].sort((first, second) => first.code.localeCompare(second.code)));
        setCode("");
        setName("");
    }, "Equipo añadido.");

    const remove = (team: AdminTeam) => {
        if (!window.confirm(`¿Eliminar ${team.name} (${team.code})?`)) return;
        void run(async () => {
            await send({ accion: "eliminar", codigo: team.code });
            setTeams((previous) => previous.filter((item) => item.code !== team.code));
        }, "Equipo eliminado.");
    };

    return (
        <div className="mt-4 space-y-4">
            <ul className="flex flex-wrap gap-2">
                {teams.map((team) => (
                    <li key={team.code} className="inline-flex items-center gap-2 border border-[var(--line)] py-1 pl-3 pr-1 text-xs">
                        <span className="font-mono font-bold text-[var(--lime)]">{team.code}</span>{team.name}
                        <button type="button" aria-label={`Eliminar ${team.name}`} disabled={status.busy} onClick={() => remove(team)} className="grid size-7 place-items-center text-[var(--muted)] hover:text-red-200 disabled:opacity-50"><X size={13} /></button>
                    </li>
                ))}
            </ul>
            <div className="flex flex-wrap items-end gap-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Código
                    <input value={code} maxLength={5} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABC" className="mt-1 block w-24 border border-[var(--line)] bg-[var(--ink)] px-3 py-2.5 font-mono text-sm uppercase text-white focus:border-[var(--lime)] focus:outline-none" />
                </label>
                <label className="block min-w-48 flex-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nombre
                    <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Nombre oficial del equipo" className="mt-1 block w-full border border-[var(--line)] bg-[var(--ink)] px-3 py-2.5 text-sm text-white focus:border-[var(--lime)] focus:outline-none" />
                </label>
                <button type="button" disabled={status.busy || !code.trim() || !name.trim()} onClick={create} className="inline-flex min-h-11 items-center gap-2 bg-[var(--lime)] px-3 text-[10px] font-black uppercase text-[var(--ink)] disabled:opacity-60"><Plus size={13} /> Añadir</button>
            </div>
            {status.message ? <p role="status" className={`text-xs ${status.error ? "text-red-300" : "text-[var(--lime)]"}`}>{status.message}</p> : null}
        </div>
    );
}
