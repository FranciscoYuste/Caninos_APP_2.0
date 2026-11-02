"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";

type CsvResult = Record<string, unknown> & { error?: string };
type CsvImport = {
    id: string;
    title: string;
    help: string;
    templateHref: string;
    endpoint: string;
    sendsCompetition: boolean;
    button: string;
    success: (result: CsvResult) => string;
};

function CsvImportForm({ item, competitionId }: { item: CsvImport; competitionId: string }) {
    const router = useRouter();
    const [state, setState] = useState({ busy: false, message: "", error: false });

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        setState({ busy: true, message: "", error: false });
        try {
            const response = await fetch(item.endpoint, { method: "POST", body: new FormData(form) });
            const result = await response.json() as CsvResult;
            if (!response.ok) {
                setState({ busy: false, message: result.error ?? "No se pudo importar el archivo.", error: true });
                return;
            }
            setState({ busy: false, message: item.success(result), error: false });
            form.reset();
            router.refresh();
        } catch {
            setState({ busy: false, message: "No se pudo conectar con el servidor.", error: true });
        }
    }

    return (
        <details className="border border-[var(--line)]">
            <summary className="cursor-pointer list-none p-4 text-sm font-black uppercase marker:hidden">{item.title}</summary>
            <div className="border-t border-[var(--line)] p-4">
                <p className="text-sm leading-6 text-[var(--muted)]">{item.help}</p>
                {/* Descarga de un CSV desde la API, no una página: debe ser un enlace normal. */}
                <a href={item.templateHref} className="mt-4 inline-flex border border-[var(--lime)] px-4 py-3 text-xs font-bold uppercase text-[var(--lime)] hover:bg-[var(--lime)] hover:text-[var(--ink)]">Descargar plantilla actualizada</a>
                <form onSubmit={submit} className="mt-5">
                    <label htmlFor={`archivo-${item.id}`} className="mb-2 block text-xs font-semibold">Archivo CSV</label>
                    {item.sendsCompetition ? <input type="hidden" name="competicion_id" value={competitionId} /> : null}
                    <input id={`archivo-${item.id}`} name="archivo" type="file" accept=".csv,text/csv,.json,application/json" required className="block w-full cursor-pointer border border-[var(--line)] bg-[var(--ink)] p-3 text-xs text-[var(--muted)] file:mr-4 file:border-0 file:bg-[var(--lime)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--ink)]" />
                    <p className="mt-2 text-[10px] text-[var(--muted)]">Edita con Excel y guarda como CSV UTF-8 · máximo 5 MB · si hay un error, no se aplica ningún cambio</p>
                    {state.message ? <p role="status" className={`mt-4 text-sm ${state.error ? "text-red-300" : "text-[var(--lime)]"}`}>{state.message}</p> : null}
                    <button disabled={state.busy} className="mt-5 inline-flex items-center gap-2 bg-[var(--lime)] px-4 py-3 text-xs font-black uppercase text-[var(--ink)] disabled:opacity-60">{state.busy ? "Procesando..." : <><FileUp size={15} /> {item.button}</>}</button>
                </form>
            </div>
        </details>
    );
}

// Cargas masivas por CSV: útiles al empezar una competición (calendario completo) o para
// rellenar muchas jornadas a la vez. El día a día se hace con los formularios.
export function AdminCsvImports({ competitionId }: { competitionId: string }) {
    const imports: CsvImport[] = [
        {
            id: "resultados",
            title: "Calendario y resultados",
            help: "La plantilla contiene todos los partidos de esta competición con los resultados guardados. Las celdas vacías no borran resultados. Si la competición es nueva y aún no tiene calendario, la plantilla sale vacía: rellena una fila por partido (temporada, jornada, códigos de local y visitante) sin goles y súbela para crear el calendario.",
            templateHref: `/api/admin/templates?tipo=resultados&competicion=${competitionId}`,
            endpoint: "/api/admin/import",
            sendsCompetition: true,
            button: "Importar resultados",
            success: (result) => `Resultados actualizados: ${result.partidos_importados} partidos · temporada ${result.temporada}.`,
        },
        {
            id: "convocatoria",
            title: "Convocatorias",
            help: "Una fila por jugador y partido del Bayern. Marca «convocado» sí/no; las celdas vacías conservan el estado anterior. Fecha y hora van juntas y el campo una vez por partido; vacías conservan el horario confirmado.",
            templateHref: `/api/admin/templates?tipo=convocatoria&competicion=${competitionId}`,
            endpoint: "/api/admin/callups",
            sendsCompetition: true,
            button: "Importar convocatorias",
            success: (result) => `Convocatorias actualizadas: ${result.jugadores_convocados} jugadores en ${result.partidos_actualizados} partidos.`,
        },
        {
            id: "estadisticas",
            title: "Estadísticas",
            help: "Solo para convocados. Para cada partido incluido en el archivo se sustituyen todas sus estadísticas, así que descarga la plantilla justo antes de editarla; los partidos no incluidos no cambian.",
            templateHref: `/api/admin/templates?tipo=estadisticas&competicion=${competitionId}`,
            endpoint: "/api/admin/player-stats",
            sendsCompetition: true,
            button: "Importar estadísticas",
            success: (result) => `Estadísticas actualizadas: ${result.estadisticas_actualizadas} jugadores-partido.`,
        },
        {
            id: "jugadores",
            title: "Dorsales y posiciones",
            help: "Plantilla común a todas las competiciones. Posiciones válidas: Portero, Cierre, Ala izquierda, Ala derecha, Pívot o Por definir. Dorsal: del 0 al 99 o vacío.",
            templateHref: "/api/admin/players",
            endpoint: "/api/admin/players",
            sendsCompetition: false,
            button: "Importar fichas",
            success: (result) => `Ficha actualizada: ${result.jugadores_actualizados} jugadores.`,
        },
    ];

    return (
        <div className="space-y-3">
            {imports.map((item) => <CsvImportForm key={item.id} item={item} competitionId={competitionId} />)}
        </div>
    );
}
