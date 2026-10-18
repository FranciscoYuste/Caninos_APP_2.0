export type ImportedMatch = {
    jornada: number;
    fecha: string | null;
    equipo_local: string;
    equipo_visitante: string;
    goles_local: number | null;
    goles_visitante: number | null;
    estadio: string | null;
};

export type JornadaImport = { temporada: string; partidos: ImportedMatch[] };

export const DEFAULT_SEASON = "2026-2027";

export const TEAM_CODES: Record<string, string> = {
    TOR: "Torrejon United",
    LOC: "Locotroes",
    MPT: "Manchester Pity",
    LAG: "Lagartos",
    SPR: "Sprinfield",
    DAG: "Daganzo Futsal",
    ZEU: "Zeus",
    ZAR: "Zarzuela XXI",
    BAY: "Bayern D.L.Caninos",
    SEV: "Severo Torrejon",
    INT: "Inter T.J.",
    BLC: "Barrio La Cañada",
};

function asCount(value: unknown, label: string): number {
    const parsed = Number(value ?? 0);
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} debe ser un entero no negativo.`);
    return parsed;
}

function normalizeMatch(row: Record<string, unknown>, fallbackSeason: string): { temporada: string; match: ImportedMatch } {
    const requiredText = (key: string) => {
        const value = String(row[key] ?? "").trim();
        if (!value) throw new Error(`Falta el campo ${key}.`);
        return value;
    };
    const teamName = (codeKey: string, nameKey: string) => {
        const code = String(row[codeKey] ?? "").trim().toUpperCase();
        if (!code) return requiredText(nameKey);
        const name = TEAM_CODES[code];
        if (!name) throw new Error(`Código de equipo no válido en ${codeKey}: ${code}.`);
        return name;
    };
    const jornada = asCount(row.jornada, "jornada");
    if (jornada < 1) throw new Error("jornada debe ser mayor que cero.");
    const rawDate = String(row.fecha ?? "").trim();
    if (rawDate && Number.isNaN(Date.parse(rawDate))) throw new Error(`Fecha no válida: ${rawDate}.`);
    const rawHomeGoals = row.goles_local;
    const rawAwayGoals = row.goles_visitante;
    const homeGoalsMissing = rawHomeGoals === undefined || rawHomeGoals === null || String(rawHomeGoals).trim() === "";
    const awayGoalsMissing = rawAwayGoals === undefined || rawAwayGoals === null || String(rawAwayGoals).trim() === "";
    if (homeGoalsMissing !== awayGoalsMissing) throw new Error("Indica los goles de ambos equipos o deja ambos vacíos para un partido programado.");

    return {
        temporada: String(row.temporada ?? fallbackSeason).trim() || fallbackSeason,
        match: {
            jornada,
            fecha: rawDate ? new Date(rawDate).toISOString() : null,
            equipo_local: teamName("codigo_local", "equipo_local"),
            equipo_visitante: teamName("codigo_visitante", "equipo_visitante"),
            goles_local: homeGoalsMissing ? null : asCount(rawHomeGoals, "goles_local"),
            goles_visitante: awayGoalsMissing ? null : asCount(rawAwayGoals, "goles_visitante"),
            estadio: String(row.estadio ?? "").trim() || null,
        },
    };
}

export function parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    const delimiter = text.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
        else if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) { row.push(field.trim().replace(/^\uFEFF/, "")); field = ""; }
        else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && text[index + 1] === "\n") index += 1;
            row.push(field.trim().replace(/^\uFEFF/, ""));
            if (row.some((cell) => cell.length)) rows.push(row);
            row = []; field = "";
        } else field += char;
    }
    if (quoted) throw new Error("El CSV contiene una comilla sin cerrar.");
    row.push(field.trim().replace(/^\uFEFF/, ""));
    if (row.some((cell) => cell.length)) rows.push(row);
    if (rows.length < 2) throw new Error("El CSV debe incluir encabezados y al menos una fila.");
    return rows;
}

function groupRows(rows: Record<string, unknown>[], fallbackSeason: string): JornadaImport {
    const matches = new Map<string, ImportedMatch>();
    let season: string | undefined;

    for (const row of rows) {
        const normalized = normalizeMatch(row, fallbackSeason);
        if (season !== undefined && normalized.temporada !== season) throw new Error("Un archivo debe contener una sola temporada.");
        season = normalized.temporada;
        const match = normalized.match;
        const key = [match.jornada, match.equipo_local, match.equipo_visitante].join("|");
        const existing = matches.get(key);
        if (existing && existing.fecha && match.fecha && existing.fecha !== match.fecha) {
            throw new Error("Las filas de un mismo partido tienen fechas distintas.");
        }
        if (existing && ((existing.goles_local !== null && match.goles_local !== null && existing.goles_local !== match.goles_local)
            || (existing.goles_visitante !== null && match.goles_visitante !== null && existing.goles_visitante !== match.goles_visitante))) {
            throw new Error("Las filas de un mismo partido tienen resultados distintos.");
        }
        matches.set(key, {
            ...match,
            fecha: match.fecha ?? existing?.fecha ?? null,
            goles_local: match.goles_local ?? existing?.goles_local ?? null,
            goles_visitante: match.goles_visitante ?? existing?.goles_visitante ?? null,
            estadio: match.estadio ?? existing?.estadio ?? null,
        });
    }
    if (matches.size === 0) throw new Error("No se encontraron partidos para importar.");
    return { temporada: season ?? fallbackSeason, partidos: [...matches.values()] };
}

export function parseJornadaJson(text: string): JornadaImport {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || !Array.isArray((data as { partidos?: unknown }).partidos)) {
        throw new Error("El JSON debe contener un arreglo 'partidos'.");
    }
    const payload = data as { temporada?: string; partidos: Array<Record<string, unknown>> };
    return groupRows(payload.partidos, String(payload.temporada ?? DEFAULT_SEASON));
}

export function parseJornadaCsv(text: string): JornadaImport {
    const [headers, ...dataRows] = parseCsvRows(text);
    const requiredHeaders = ["jornada", "goles_local", "goles_visitante"];
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Faltan columnas CSV: ${missing.join(", ")}.`);
    const hasLocalTeam = headers.includes("equipo_local") || headers.includes("codigo_local");
    const hasAwayTeam = headers.includes("equipo_visitante") || headers.includes("codigo_visitante");
    if (!hasLocalTeam || !hasAwayTeam) {
        throw new Error("Incluye equipo_local/equipo_visitante o codigo_local/codigo_visitante en el CSV.");
    }
    const rows = dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
    return groupRows(rows, DEFAULT_SEASON);
}

export function parseJornadaFile(text: string, filename: string): JornadaImport {
    if (filename.toLowerCase().endsWith(".json")) return parseJornadaJson(text);
    if (filename.toLowerCase().endsWith(".csv")) return parseJornadaCsv(text);
    throw new Error("Formato no soportado. Sube un archivo .json o .csv.");
}