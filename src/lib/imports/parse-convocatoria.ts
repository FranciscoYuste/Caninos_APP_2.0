import { DEFAULT_SEASON, parseCsvRows, TEAM_CODES } from "@/lib/imports/parse-jornada";

export type ImportedCallup = {
    jornada: number;
    fecha: string;
    hora: string;
    campo: string;
    equipo_local: string;
    equipo_visitante: string;
    actualizar_convocatoria: boolean;
    jugadores: Array<{ jugador_id: string; convocado: boolean | null }>;
};

export type CallupImport = { temporada: string; partidos: ImportedCallup[] };

function parseOptionalBoolean(value: string): boolean | null {
    const normalized = value.trim().toLocaleLowerCase("es");
    if (normalized === "") return null;
    if (["si", "sí", "true", "1"].includes(normalized)) return true;
    if (["no", "false", "0"].includes(normalized)) return false;
    throw new Error(`Valor no válido para convocado: ${value}. Usa sí o no.`);
}

function normalizeDate(value: string): string {
    const input = value.trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
    const spanish = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2}|\d{4})$/.exec(input);
    const parts = iso
        ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
        : spanish
            ? [Number(spanish[3].length === 2 ? `20${spanish[3]}` : spanish[3]), Number(spanish[2]), Number(spanish[1])]
            : null;
    if (!parts) throw new Error(`Fecha no válida: ${input}. Usa AAAA-MM-DD o DD/MM/AAAA.`);
    const [year, month, day] = parts;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error(`Fecha no válida: ${input}.`);
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeTime(value: string): string {
    const input = value.trim();
    const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(input);
    if (!match) throw new Error(`Hora no válida: ${input}. Usa HH:MM.`);
    return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}

function teamName(row: Record<string, string>, codeColumn: string, nameColumn: string): string {
    const code = String(row[codeColumn] ?? "").trim().toUpperCase();
    const name = String(row[nameColumn] ?? "").trim();
    const resolved = code ? TEAM_CODES[code] : name;
    if (!resolved) throw new Error(`Indica ${codeColumn} o ${nameColumn} con un equipo válido.`);
    return resolved;
}

export function parseConvocatoriaCsv(text: string): CallupImport {
    const [rawHeaders, ...dataRows] = parseCsvRows(text);
    const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
    const requiredHeaders = ["temporada", "jornada", "fecha", "hora", "campo", "jugador_id", "convocado"];
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Faltan columnas CSV: ${missing.join(", ")}.`);
    if (!(headers.includes("codigo_local") || headers.includes("equipo_local"))
        || !(headers.includes("codigo_visitante") || headers.includes("equipo_visitante"))) {
        throw new Error("Incluye codigo_local/equipo_local y codigo_visitante/equipo_visitante.");
    }

    const rows = dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
    const matches = new Map<string, ImportedCallup>();
    let season: string | undefined;

    for (const row of rows) {
        const jugadorId = String(row.jugador_id ?? "").trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jugadorId)) {
            throw new Error(`El jugador ${jugadorId} no es un UUID válido.`);
        }

        const jornada = Number(row.jornada);
        if (!Number.isInteger(jornada) || jornada < 1) throw new Error("jornada debe ser un entero mayor que cero.");
        const rawDate = String(row.fecha ?? "").trim();
        const rawTime = String(row.hora ?? "").trim();
        const date = rawDate ? normalizeDate(rawDate) : "";
        const time = rawTime ? normalizeTime(rawTime) : "";
        const field = String(row.campo ?? "").trim();

        const home = teamName(row, "codigo_local", "equipo_local");
        const away = teamName(row, "codigo_visitante", "equipo_visitante");
        if (home !== "Bayern D.L.Caninos" && away !== "Bayern D.L.Caninos") {
            throw new Error("La plantilla de convocatoria solo admite partidos del Bayern D.L.Caninos.");
        }
        const currentSeason = String(row.temporada ?? "").trim() || DEFAULT_SEASON;
        if (season !== undefined && currentSeason !== season) throw new Error("Un archivo debe contener una sola temporada.");
        season = currentSeason;

        const key = [jornada, home, away].join("|");
        const existing = matches.get(key);
        if (existing && ((date && existing.fecha && existing.fecha !== date)
            || (time && existing.hora && existing.hora !== time)
            || (field && existing.campo && existing.campo !== field))) {
            throw new Error(`Los datos de fecha, hora y campo no coinciden para la jornada ${jornada}.`);
        }
        const match = existing ?? {
            jornada,
            fecha: date,
            hora: time,
            campo: field,
            equipo_local: home,
            equipo_visitante: away,
            actualizar_convocatoria: false,
            jugadores: [],
        };
        match.fecha = date || match.fecha;
        match.hora = time || match.hora;
        match.campo = field || match.campo;
        if (match.jugadores.some((player) => player.jugador_id === jugadorId)) {
            throw new Error(`El jugador ${jugadorId} aparece más de una vez en el mismo partido.`);
        }
        const convocado = parseOptionalBoolean(String(row.convocado ?? ""));
        if (convocado !== null) match.actualizar_convocatoria = true;
        match.jugadores.push({ jugador_id: jugadorId, convocado });
        matches.set(key, match);
    }

    if (matches.size === 0) throw new Error("Añade al menos un jugador convocado con su UUID.");
    const updatedMatches = [...matches.values()].filter((match) =>
        match.actualizar_convocatoria || Boolean(match.fecha || match.hora || match.campo),
    );
    for (const match of updatedMatches) {
        if (Boolean(match.fecha) !== Boolean(match.hora)) {
            throw new Error(`Completa fecha y hora definitivas o deja ambas vacías para la jornada ${match.jornada}.`);
        }
    }
    if (!updatedMatches.length) throw new Error("Marca convocado como sí o no en al menos una jornada, o completa un horario definitivo.");
    return { temporada: season ?? DEFAULT_SEASON, partidos: updatedMatches };
}
