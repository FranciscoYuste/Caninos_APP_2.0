"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileUp } from "lucide-react";
import { AdminCallupForm, type CallupFormMatch } from "@/components/admin-callup-form";
import { AdminCompetitionsManager } from "@/components/admin-competitions-manager";
import { AdminKatsuManager } from "@/components/admin-katsu-manager";
import { AdminInjuryManager } from "@/components/admin-injury-manager";
import { AdminMatchChronicleManager } from "@/components/admin-match-chronicle-manager";
import { AdminMediaManager, type MediaMatch, type MediaPlayer } from "@/components/admin-media-manager";
import { AdminTeamsManager, type AdminTeam } from "@/components/admin-teams-manager";
import type { Competition } from "@/lib/competition-data";
import { competitionPath } from "@/lib/competition-paths";

const STATUS_LABELS: Record<Competition["status"], string> = { pendiente: "Pendiente", en_curso: "En curso", finalizada: "Finalizada" };

type KatsuMatch = { id: string; jornada: number; home: string; away: string; score: string | null; playerId: string | null };
type KatsuPlayer = { id: string; name: string; number: number | null };
type InjuryPlayer = { id: string; name: string; number: number | null; injured: boolean; injuryDescription: string | null };
type ChronicleMatch = { id: string; jornada: number; home: string; away: string; chronicle: string | null };

export function AdminImporter({ competition, competitions, teams, katsuMatches, katsuPlayers, injuryPlayers, chronicleMatches, callupMatches, mediaMatches, mediaPlayers }: { competition: Competition; competitions: Competition[]; teams: AdminTeam[]; katsuMatches: KatsuMatch[]; katsuPlayers: KatsuPlayer[]; injuryPlayers: InjuryPlayer[]; chronicleMatches: ChronicleMatch[]; callupMatches: CallupFormMatch[]; mediaMatches: MediaMatch[]; mediaPlayers: MediaPlayer[] }) {
    const router = useRouter();
    const [resultsMessage, setResultsMessage] = useState("");
    const [resultsError, setResultsError] = useState(false);
    const [resultsBusy, setResultsBusy] = useState(false);
    const [callupsMessage, setCallupsMessage] = useState("");
    const [callupsError, setCallupsError] = useState(false);
    const [callupsBusy, setCallupsBusy] = useState(false);
    const [statsMessage, setStatsMessage] = useState("");
    const [statsError, setStatsError] = useState(false);
    const [statsBusy, setStatsBusy] = useState(false);
    const [playersMessage, setPlayersMessage] = useState("");
    const [playersError, setPlayersError] = useState(false);
    const [playersBusy, setPlayersBusy] = useState(false);

    async function submitResults(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setResultsBusy(true);
        setResultsMessage("");
        setResultsError(false);
        try {
            const response = await fetch("/api/admin/import", { method: "POST", body: formData });
            const result = await response.json() as { error?: string; partidos_importados?: number; temporada?: string };
            if (!response.ok) {
                setResultsError(true);
                setResultsMessage(result.error ?? "No se pudo importar el archivo.");
                return;
            }
            setResultsMessage(`Resultados actualizados: ${result.partidos_importados} partidos · fase Campeón de Invierno · temporada ${result.temporada}.`);
            form.reset();
        } catch {
            setResultsError(true);
            setResultsMessage("No se pudo conectar con el servidor.");
        } finally {
            setResultsBusy(false);
        }
    }

    async function submitCallups(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setCallupsBusy(true);
        setCallupsMessage("");
        setCallupsError(false);
        try {
            const response = await fetch("/api/admin/callups", { method: "POST", body: new FormData(form) });
            const result = await response.json() as { error?: string; partidos_actualizados?: number; jugadores_convocados?: number; temporada?: string };
            if (!response.ok) {
                setCallupsError(true);
                setCallupsMessage(result.error ?? "No se pudo importar la convocatoria.");
                return;
            }
            setCallupsMessage(`Convocatorias actualizadas: ${result.jugadores_convocados} jugadores en ${result.partidos_actualizados} partidos · temporada ${result.temporada}.`);
            form.reset();
        } catch {
            setCallupsError(true);
            setCallupsMessage("No se pudo conectar con el servidor.");
        } finally {
            setCallupsBusy(false);
        }
    }

    async function submitPlayerStats(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setStatsBusy(true);
        setStatsMessage("");
        setStatsError(false);
        try {
            const response = await fetch("/api/admin/player-stats", { method: "POST", body: new FormData(form) });
            const result = await response.json() as { error?: string; estadisticas_actualizadas?: number; temporada?: string };
            if (!response.ok) {
                setStatsError(true);
                setStatsMessage(result.error ?? "No se pudieron importar las estadísticas.");
                return;
            }
            setStatsMessage(`Estadísticas actualizadas: ${result.estadisticas_actualizadas} jugadores-partido · temporada ${result.temporada}.`);
            form.reset();
        } catch {
            setStatsError(true);
            setStatsMessage("No se pudo conectar con el servidor.");
        } finally {
            setStatsBusy(false);
        }
    }

    async function submitPlayers(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setPlayersBusy(true);
        setPlayersMessage("");
        setPlayersError(false);
        try {
            const response = await fetch("/api/admin/players", { method: "POST", body: new FormData(form) });
            const result = await response.json() as { error?: string; jugadores_actualizados?: number };
            if (!response.ok) {
                setPlayersError(true);
                setPlayersMessage(result.error ?? "No se pudo actualizar la plantilla.");
                return;
            }
            setPlayersMessage(`Ficha actualizada: ${result.jugadores_actualizados} jugadores.`);
            form.reset();
        } catch {
            setPlayersError(true);
            setPlayersMessage("No se pudo conectar con el servidor.");
        } finally {
            setPlayersBusy(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted)] hover:text-white"><ArrowLeft size={15} /> Volver al equipo</Link>
            <p className="mt-14 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Administración</p>
            <h1 className="mt-2 text-4xl font-black uppercase">Actualizar competición</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Cada competición mantiene sus propios resultados, convocatorias y estadísticas. La plantilla y posición de los jugadores es común para todas. Elige qué competición gestionar.</p>

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

            <details open className="mt-8 border border-[var(--lime)]/50 bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase marker:hidden sm:px-7">
                    {competition.name} <span className="ml-2 text-[10px] font-bold tracking-[0.12em] text-[var(--lime)]">{STATUS_LABELS[competition.status].toUpperCase()} · {competition.season}</span>
                </summary>
                <p className="px-5 pb-4 text-xs text-[var(--muted)] sm:px-7">Página pública: <Link href={competitionPath(competition)} className="font-mono text-[var(--lime)] underline-offset-4 hover:underline">{competitionPath(competition)}</Link></p>
                <div className="space-y-6 border-t border-[var(--line)] p-5 sm:p-7">
                <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">1. Resultados</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Descarga la plantilla actualizada desde Supabase: contiene todos los partidos de esta competición y conserva los resultados ya importados. Cambia solo los marcadores que quieras actualizar; las celdas vacías no borran resultados anteriores. Si la competición es nueva y aún no tiene calendario, la plantilla sale vacía: rellena una fila por partido (temporada, jornada, códigos de local y visitante) sin goles y súbela para crear el calendario.</p>
                <a href={`/api/admin/templates?tipo=resultados&competicion=${competition.id}`} className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                <form onSubmit={submitResults} className="mt-5">
                    <label htmlFor="archivo-resultados" className="mb-2 block text-xs font-semibold">Archivo de resultados (CSV o JSON)</label>
                    <input type="hidden" name="competicion_id" value={competition.id} />
                    <input id="archivo-resultados" name="archivo" type="file" accept=".json,.csv,application/json,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Edita la plantilla con Excel y guárdala como CSV UTF-8 antes de subirla · máximo 5 MB</p>
                    {resultsMessage && <p role="status" className={`mt-4 text-sm ${resultsError ? "text-red-300" : "text-[var(--lime)]"}`}>{resultsMessage}</p>}
                    <button disabled={resultsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{resultsBusy ? "Procesando..." : <><FileUp size={15} /> Importar resultados</>}</button>
                </form>
                </div>
                </details>

                <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">2. Convocatoria y horario definitivo</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Elige el partido, marca a los convocados y, cuando se conozcan, la fecha, la hora y el campo. Se guarda al momento y se ve en la web.</p>
                <AdminCallupForm matches={callupMatches} players={katsuPlayers} />
                <details className="mt-6 border-t border-[var(--line)] pt-4">
                <summary className="cursor-pointer text-xs font-bold uppercase text-[var(--muted)]">Carga masiva por CSV</summary>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Puedes cargar las convocatorias semana a semana, aunque aún no se conozcan la fecha, la hora o el campo: la fecha prevista es solo informativa y no se convierte en horario confirmado. En la columna «convocado», marca sí/no para cada jugador de la jornada; las filas vacías conservan su estado anterior. Cuando se confirme, añade fecha y hora definitivas juntas y el campo una sola vez por partido. Una carga posterior conserva el horario confirmado si esos campos se dejan vacíos.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <a href={`/api/admin/templates?tipo=convocatoria&competicion=${competition.id}`} className="inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                </div>
                <form onSubmit={submitCallups} className="mt-5">
                    <label htmlFor="archivo-convocatoria" className="mb-2 block text-xs font-semibold">Archivo de convocatoria (CSV)</label>
                    <input type="hidden" name="competicion_id" value={competition.id} />
                    <input id="archivo-convocatoria" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">CSV UTF-8 · máximo 5 MB · solo existe «convocado» sí/no; puedes dejar jornadas sin rellenar</p>
                    {callupsMessage && <p role="status" className={`mt-4 text-sm ${callupsError ? "text-red-300" : "text-[var(--lime)]"}`}>{callupsMessage}</p>}
                    <button disabled={callupsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{callupsBusy ? "Procesando..." : <><FileUp size={15} /> Importar convocatoria</>}</button>
                </form>
                </details>
                </div>
                </details>
            <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">3. Estadísticas por jugador y partido</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Después de importar la convocatoria, descarga la plantilla actualizada. Incluye jugadores y estadísticas ya guardadas para cada partido del Bayern. Completa estadísticas solo para jugadores convocados que tengan datos; un convocado puede tener una fila de estadísticas o no tenerla. Deja todas las columnas vacías si no hay estadísticas que registrar. Las filas con todo a cero también se consideran sin datos.</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Al reimportar, para cada partido incluido se sustituye el detalle por lo que indique el archivo. Descarga una plantilla nueva antes de editar para conservar los datos anteriores; las estadísticas de los demás partidos no cambian.</p>
                <a href={`/api/admin/templates?tipo=estadisticas&competicion=${competition.id}`} className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                <form onSubmit={submitPlayerStats} className="mt-5">
                    <label htmlFor="archivo-estadisticas" className="mb-2 block text-xs font-semibold">Archivo de estadísticas (CSV)</label>
                    <input type="hidden" name="competicion_id" value={competition.id} />
                    <input id="archivo-estadisticas" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Edita en Excel y guarda como CSV UTF-8 · máximo 5 MB</p>
                    {statsMessage && <p role="status" className={`mt-4 text-sm ${statsError ? "text-red-300" : "text-[var(--lime)]"}`}>{statsMessage}</p>}
                    <button disabled={statsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{statsBusy ? "Procesando..." : <><FileUp size={15} /> Importar estadísticas</>}</button>
                </form>
                </div>
            </details>
            <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">4. Jugador KATSU por partido</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Elige el jugador destacado de cada partido del Bayern. Esta elección se guarda por separado y no se modifica al importar resultados o convocatorias.</p>
                <AdminKatsuManager matches={katsuMatches} players={katsuPlayers} />
                </div>
            </details>
            <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">5. Parte médico</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Marca o desmarca los jugadores lesionados. El estado se guarda por separado de los CSV y se refleja en el apartado público de lesionados.</p>
                <AdminInjuryManager players={injuryPlayers} />
                </div>
            </details>
            <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">6. Crónica por partido</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Escribe una crónica para cada partido del Bayern. Puedes incluir hasta 100.000 caracteres; deja una línea en blanco entre párrafos. Si borras el texto y guardas, la crónica dejará de mostrarse en la página pública.</p>
                <AdminMatchChronicleManager matches={chronicleMatches} />
                </div>
            </details>
            <details className="border border-[var(--line)]">
                <summary className="cursor-pointer list-none p-4 text-base font-black uppercase marker:hidden">7. Fotos y vídeos</summary>
                <div className="border-t border-[var(--line)] p-4">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sube fotos desde la galería o la cámara del móvil. Se guardan en Supabase Storage y se ven en la web al momento.</p>
                <AdminMediaManager players={mediaPlayers} matches={mediaMatches} />
                </div>
            </details>
                </div>
            </details>

            <details className="mt-4 border border-[var(--line)] bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase marker:hidden sm:px-7">Competiciones y temporadas</summary>
                <div className="border-t border-[var(--line)] p-5 sm:p-7">
                    <p className="text-sm leading-6 text-[var(--muted)]">Da de alta cada competición (liga de ascenso o descenso, copa, la liga de una temporada nueva…) y marca su estado. La web pública muestra la que esté «En curso»; las «Finalizadas» quedan en el archivo y las «Pendientes» aparecen con un aviso. El tipo, el grupo y la temporada solo se pueden cambiar mientras la competición no tenga partidos.</p>
                    <AdminCompetitionsManager competitions={competitions} managingId={competition.id} />
                </div>
            </details>

            <details className="mt-4 border border-[var(--line)] bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase marker:hidden sm:px-7">Equipos rivales</summary>
                <div className="border-t border-[var(--line)] p-5 sm:p-7">
                    <p className="text-sm leading-6 text-[var(--muted)]">Códigos que se usan en las columnas codigo_local y codigo_visitante de los CSV. Añade aquí los rivales de una competición nueva antes de subir su calendario. Un equipo con partidos no se puede eliminar.</p>
                    <AdminTeamsManager teams={teams} />
                </div>
            </details>

            <details className="mt-6 border border-[var(--line)] bg-[var(--panel)]">
                <summary className="cursor-pointer list-none p-5 text-lg font-black uppercase marker:hidden sm:p-7">Plantilla común de jugadores</summary>
                <div className="border-t border-[var(--line)] p-5 sm:p-7">
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Esta ficha se comparte entre todas las competiciones. Los cambios de dorsal y posición se reflejan en cada una.</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Posiciones válidas: Portero, Cierre, Ala izquierda, Ala derecha, Pívot o Por definir. Dorsal: número del 0 al 99 o vacío. Guarda el archivo como CSV UTF-8.</p>
                {/* Descarga de un CSV desde la API, no una página: debe ser un enlace normal. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/admin/players" className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla de jugadores</a>
                <form onSubmit={submitPlayers} className="mt-5">
                    <label htmlFor="archivo-jugadores" className="mb-2 block text-xs font-semibold">Plantilla de jugadores (CSV)</label>
                    <input id="archivo-jugadores" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Máximo 5 MB · si hay un error de validación, no se actualiza ningún jugador</p>
                    {playersMessage && <p role="status" className={`mt-4 text-sm ${playersError ? "text-red-300" : "text-[var(--lime)]"}`}>{playersMessage}</p>}
                    <button disabled={playersBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{playersBusy ? "Procesando..." : <><FileUp size={15} /> Importar fichas</>}</button>
                </form>
                </div>
            </details>
            <p className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><Check size={14} className="text-[var(--lime)]" /> Cada archivo se procesa de forma transaccional y puede volver a cargarse.</p>
        </main>
    );
}