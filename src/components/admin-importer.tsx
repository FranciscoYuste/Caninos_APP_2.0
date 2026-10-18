"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, FileUp } from "lucide-react";

export function AdminImporter() {
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
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Cada competición mantiene sus propios resultados, convocatorias y estadísticas, asociados a su fase y grupo en la base de datos. La plantilla y posición de los jugadores es común para todas. Abre una competición para ver sus ficheros.</p>

            <details open className="mt-8 border border-[var(--lime)]/50 bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase marker:hidden sm:px-7">
                    Liga de invierno <span className="ml-2 text-[10px] font-bold tracking-[0.12em] text-[var(--lime)]">ACTIVA · 2026-2027</span>
                </summary>
                <div className="space-y-6 border-t border-[var(--line)] p-5 sm:p-7">
                <section>
                <h2 className="text-xl font-black uppercase">1. Resultados</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Descarga la plantilla actualizada desde Supabase: contiene los 66 partidos y conserva los resultados ya importados. Cambia solo los marcadores que quieras actualizar; las celdas vacías no borran resultados anteriores.</p>
                <a href="/api/admin/templates?tipo=resultados&fase=campeon_invierno" className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                <form onSubmit={submitResults} className="mt-5">
                    <label htmlFor="archivo-resultados" className="mb-2 block text-xs font-semibold">Archivo de resultados (CSV o JSON)</label>
                    <input type="hidden" name="fase" value="campeon_invierno" />
                    <input type="hidden" name="grupo" value="" />
                    <input id="archivo-resultados" name="archivo" type="file" accept=".json,.csv,application/json,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Edita la plantilla con Excel y guárdala como CSV UTF-8 antes de subirla · máximo 5 MB</p>
                    {resultsMessage && <p role="status" className={`mt-4 text-sm ${resultsError ? "text-red-300" : "text-[var(--lime)]"}`}>{resultsMessage}</p>}
                    <button disabled={resultsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{resultsBusy ? "Procesando..." : <><FileUp size={15} /> Importar resultados</>}</button>
                </form>
                </section>

                <section>
                <h2 className="text-xl font-black uppercase">2. Convocatoria y horario definitivo</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Puedes cargar las convocatorias semana a semana, aunque aún no se conozcan la fecha, la hora o el campo: la fecha prevista es solo informativa y no se convierte en horario confirmado. En la columna «convocado», marca sí/no para cada jugador de la jornada; las filas vacías conservan su estado anterior. Cuando se confirme, añade fecha y hora definitivas juntas y el campo una sola vez por partido. Una carga posterior conserva el horario confirmado si esos campos se dejan vacíos.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <a href="/api/admin/templates?tipo=convocatoria&fase=campeon_invierno" className="inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                </div>
                <form onSubmit={submitCallups} className="mt-5">
                    <label htmlFor="archivo-convocatoria" className="mb-2 block text-xs font-semibold">Archivo de convocatoria (CSV)</label>
                    <input type="hidden" name="fase" value="campeon_invierno" />
                    <input type="hidden" name="grupo" value="" />
                    <input id="archivo-convocatoria" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">CSV UTF-8 · máximo 5 MB · solo existe «convocado» sí/no; puedes dejar jornadas sin rellenar</p>
                    {callupsMessage && <p role="status" className={`mt-4 text-sm ${callupsError ? "text-red-300" : "text-[var(--lime)]"}`}>{callupsMessage}</p>}
                    <button disabled={callupsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{callupsBusy ? "Procesando..." : <><FileUp size={15} /> Importar convocatoria</>}</button>
                </form>
            </section>
            <section>
                <h2 className="text-xl font-black uppercase">3. Estadísticas por jugador y partido</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Después de importar la convocatoria, descarga la plantilla actualizada. Incluye jugadores y estadísticas ya guardadas para cada partido del Bayern. Completa estadísticas solo para jugadores convocados que tengan datos; un convocado puede tener una fila de estadísticas o no tenerla. Deja todas las columnas vacías si no hay estadísticas que registrar. Las filas con todo a cero también se consideran sin datos.</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Al reimportar, para cada partido incluido se sustituye el detalle por lo que indique el archivo. Descarga una plantilla nueva antes de editar para conservar los datos anteriores; las estadísticas de los demás partidos no cambian.</p>
                <a href="/api/admin/templates?tipo=estadisticas&fase=campeon_invierno" className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                <form onSubmit={submitPlayerStats} className="mt-5">
                    <label htmlFor="archivo-estadisticas" className="mb-2 block text-xs font-semibold">Archivo de estadísticas (CSV)</label>
                    <input type="hidden" name="fase" value="campeon_invierno" />
                    <input type="hidden" name="grupo" value="" />
                    <input id="archivo-estadisticas" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Edita en Excel y guarda como CSV UTF-8 · máximo 5 MB</p>
                    {statsMessage && <p role="status" className={`mt-4 text-sm ${statsError ? "text-red-300" : "text-[var(--lime)]"}`}>{statsMessage}</p>}
                    <button disabled={statsBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{statsBusy ? "Procesando..." : <><FileUp size={15} /> Importar estadísticas</>}</button>
                </form>
            </section>
                </div>
            </details>

            <details className="mt-4 border border-[var(--line)] bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase sm:px-7">Liga de ascenso o descenso <span className="ml-2 text-[10px] font-bold tracking-[0.12em] text-[var(--muted)]">PENDIENTE DE CLASIFICACIÓN</span></summary>
                <div className="space-y-4 border-t border-[var(--line)] p-5 sm:p-7">
                    <p className="text-sm leading-6 text-[var(--muted)]">Al terminar la Liga de invierno se habilitará el grupo que corresponda. Los resultados, convocatorias y estadísticas tendrán su propia fase en la base de datos; la ficha de jugadores seguirá siendo común.</p>
                    {["Resultados y calendario", "Convocatorias y horarios", "Estadísticas por partido"].map((label) => <div key={label} className="border border-[var(--line)] p-4"><h3 className="text-sm font-bold uppercase">{label}</h3><p className="mt-1 text-xs text-[var(--muted)]">Pendiente de conocer equipos y calendario. Se habilitará su plantilla propia cuando se cargue el calendario.</p></div>)}
                </div>
            </details>

            <details className="mt-4 border border-[var(--line)] bg-[var(--panel)]">
                <summary className="cursor-pointer list-none px-5 py-5 text-lg font-black uppercase sm:px-7">Copa <span className="ml-2 text-[10px] font-bold tracking-[0.12em] text-[var(--muted)]">PENDIENTE DE FORMATO</span></summary>
                <div className="space-y-4 border-t border-[var(--line)] p-5 sm:p-7">
                    <p className="text-sm leading-6 text-[var(--muted)]">Se prevé separar la fase de grupos del cuadro eliminatorio. No se generan plantillas hasta confirmar el formato, los equipos, los grupos y las reglas del cuadro.</p>
                    {["Resultados y grupos", "Convocatorias y horarios", "Estadísticas por partido", "Cuadro eliminatorio"].map((label) => <div key={label} className="border border-[var(--line)] p-4"><h3 className="text-sm font-bold uppercase">{label}</h3><p className="mt-1 text-xs text-[var(--muted)]">Pendiente de formato y calendario. Sus datos quedarán asociados a la fase y al grupo/etapa correspondientes.</p></div>)}
                </div>
            </details>

            <section className="mt-6 border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-7">
                <h2 className="text-xl font-black uppercase">Plantilla común de jugadores</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Esta ficha se comparte entre todas las competiciones. Los cambios de dorsal y posición se reflejan en cada una.</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Posiciones válidas: Portero, Cierre, Ala izquierda, Ala derecha, Pívot o Por definir. Dorsal: número del 0 al 99 o vacío. Guarda el archivo como CSV UTF-8.</p>
                <a href="/api/admin/players" className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla de jugadores</a>
                <form onSubmit={submitPlayers} className="mt-5">
                    <label htmlFor="archivo-jugadores" className="mb-2 block text-xs font-semibold">Plantilla de jugadores (CSV)</label>
                    <input id="archivo-jugadores" name="archivo" type="file" accept=".csv,text/csv" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Máximo 5 MB · si hay un error de validación, no se actualiza ningún jugador</p>
                    {playersMessage && <p role="status" className={`mt-4 text-sm ${playersError ? "text-red-300" : "text-[var(--lime)]"}`}>{playersMessage}</p>}
                    <button disabled={playersBusy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{playersBusy ? "Procesando..." : <><FileUp size={15} /> Importar fichas</>}</button>
                </form>
            </section>
            <p className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><Check size={14} className="text-[var(--lime)]" /> Cada archivo se procesa de forma transaccional y puede volver a cargarse.</p>
        </main>
    );
}