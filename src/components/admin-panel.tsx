"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminCompetitionsManager } from "@/components/admin-competitions-manager";
import { AdminCsvImports } from "@/components/admin-csv-imports";
import { AdminInjuryManager } from "@/components/admin-injury-manager";
import { AdminMatchHub, type HubMatch, type HubPlayer } from "@/components/admin-match-hub";
import { AdminPlayerMedia, type MediaPlayer } from "@/components/admin-media";
import { AdminRoundResults, type ResultMatch } from "@/components/admin-results-editor";
import { AdminRosterManager, type RosterPlayer } from "@/components/admin-roster-manager";
import { AdminTeamsManager, type AdminTeam } from "@/components/admin-teams-manager";
import type { Competition } from "@/lib/competition-data";
import { competitionPath } from "@/lib/competition-paths";

const STATUS_LABELS: Record<Competition["status"], string> = { pendiente: "Pendiente", en_curso: "En curso", finalizada: "Finalizada" };

type InjuryPlayer = { id: string; name: string; number: number | null; injured: boolean; injuryDescription: string | null };

function Section({ title, description, open = false, children }: { title: string; description?: string; open?: boolean; children: ReactNode }) {
    return (
        <details open={open} className="border border-[var(--line)] bg-[var(--panel)]">
            <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase marker:hidden sm:px-7">{title}</summary>
            <div className="border-t border-[var(--line)] p-4 sm:p-7">
                {description ? <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
                {children}
            </div>
        </details>
    );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <details className="border border-[var(--line)]">
            <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">{title}</summary>
            <div className="border-t border-[var(--line)] p-4">{children}</div>
        </details>
    );
}

export function AdminPanel({ competition, competitions, teams, hubMatches, roundMatches, players, roster, injuryPlayers, mediaPlayers }: {
    competition: Competition;
    competitions: Competition[];
    teams: AdminTeam[];
    hubMatches: HubMatch[];
    roundMatches: ResultMatch[];
    players: HubPlayer[];
    roster: RosterPlayer[];
    injuryPlayers: InjuryPlayer[];
    mediaPlayers: MediaPlayer[];
}) {
    const router = useRouter();
    // El parte médico y las fotos guardan su propio estado: se reinician si cambia la plantilla.
    const activeRoster = players.map((player) => `${player.id}:${player.number}:${player.name}`).join("|");

    return (
        <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted)] hover:text-white"><ArrowLeft size={15} /> Volver al equipo</Link>
            <p className="mt-14 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Administración</p>
            <h1 className="mt-2 text-4xl font-black uppercase">Gestionar el equipo</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Todo se guarda al momento y se puede corregir cuando quieras. Cada competición tiene sus propios partidos; la plantilla es común a todas.</p>

            <label className="mt-6 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                Gestionando
                <select
                    value={competition.id}
                    onChange={(event) => router.push(`/admin?competicion=${event.target.value}`)}
                    className="mt-2 w-full border border-[var(--lime)]/60 bg-[var(--panel)] px-3 py-3 text-sm font-bold normal-case tracking-normal text-white focus:border-[var(--lime)] focus:outline-none"
                >
                    {competitions.map((item) => <option key={item.id} value={item.id}>{item.season} · {item.name}{item.group ? ` · ${item.group}` : ""} ({STATUS_LABELS[item.status]})</option>)}
                </select>
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">Página pública: <Link href={competitionPath(competition)} className="font-mono text-[var(--lime)] underline-offset-4 hover:underline">{competitionPath(competition)}</Link></p>

            <div className="mt-8 space-y-4">
                <Section title="Partidos del Bayern" open description="Elige un partido y completa cada paso. El primero que falte se abre solo.">
                    <AdminMatchHub competitionId={competition.id} matches={hubMatches} players={players} />
                </Section>

                <Section title="Resultados de la jornada" description="Todos los partidos de cada jornada, también los de los rivales: la clasificación se calcula con ellos.">
                    <AdminRoundResults competitionId={competition.id} matches={roundMatches} />
                </Section>

                <Section title="Plantilla" description="Común a todas las competiciones. Un jugador de baja deja de salir en la plantilla actual, pero sigue en las competiciones en las que fue convocado.">
                    <AdminRosterManager players={roster} />
                    <div className="mt-6 space-y-3">
                        <SubSection title="Parte médico">
                            <p className="text-sm leading-6 text-[var(--muted)]">Marca o desmarca los jugadores lesionados. Se refleja en el apartado público de lesionados.</p>
                            <AdminInjuryManager key={activeRoster} players={injuryPlayers} />
                        </SubSection>
                        <SubSection title="Fotos y vídeos">
                            <AdminPlayerMedia key={activeRoster} players={mediaPlayers} />
                        </SubSection>
                    </div>
                </Section>

                <Section title="Importación por CSV" description="Para cargas grandes: el calendario de una competición nueva o muchas jornadas a la vez.">
                    <AdminCsvImports competitionId={competition.id} />
                </Section>

                <Section title="Competiciones y temporadas" description="Da de alta cada competición (liga de ascenso o descenso, copa, la liga de una temporada nueva…) y marca su estado. La web pública muestra la que esté «En curso»; las «Finalizadas» quedan en el archivo y las «Pendientes» aparecen con un aviso. El tipo, el grupo y la temporada solo se pueden cambiar mientras la competición no tenga partidos.">
                    <AdminCompetitionsManager competitions={competitions} managingId={competition.id} />
                </Section>

                <Section title="Equipos rivales" description="Códigos que se usan en los CSV (codigo_local, codigo_visitante). Añade aquí los rivales de una competición nueva antes de subir su calendario. Un equipo con partidos no se puede eliminar.">
                    <AdminTeamsManager teams={teams} />
                </Section>
            </div>
        </main>
    );
}
