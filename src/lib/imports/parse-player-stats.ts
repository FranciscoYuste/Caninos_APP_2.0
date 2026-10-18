import { DEFAULT_SEASON, parseCsvRows, TEAM_CODES } from "@/lib/imports/parse-jornada";

type PlayerMatchStatistics = {
    goles: number;
    asistencias: number;
    penaltis_marcados: number;
    penaltis_tirados: number;
    dobles_penaltis_marcados: number;
    dobles_penaltis_tirados: number;
    faltas_directas_marcadas: number;
    amarillas: number;
    rojas: number;
};

export type ImportedPlayerStats = PlayerMatchStatistics & { jugador_id: string };

export type PlayerStatsImport = {
    temporada: string;
    partidos: Array<{
        jornada: number;
        equipo_local: string;
        equipo_visitante: string;
        estadisticas: ImportedPlayerStats[];
    }>;
};

const STAT_COLUMNS = [
    "goles",
    "asistencias",
    "penaltis_marcados",
    "penaltis_tirados",
    "dobles_penaltis_marcados",
    "dobles_penaltis_tirados",
    "faltas_directas_marcadas",
    "amarillas",
    "rojas",
] as const;

function asCount(value: string, field: string): number {
    const parsed = Number(value || 0);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 32767) {
        throw new Error(`${field} debe ser un entero entre 0 y 32767.`);
    }
    return parsed;
}

function teamName(row: Record<string, string>, codeColumn: string, nameColumn: string): string {
    const code = String(row[codeColumn] ?? "").trim().toUpperCase();
    const name = String(row[nameColumn] ?? "").trim();
    const resolved = code ? TEAM_CODES[code] : name;
    if (!resolved) throw new Error(`Indica ${codeColumn} o ${nameColumn} con un equipo válido.`);
    return resolved;
}

export function parsePlayerStatsCsv(text: string): PlayerStatsImport {
    const [rawHeaders, ...dataRows] = parseCsvRows(text);
    const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
    const requiredHeaders = ["temporada", "jornada", "jugador_id", ...STAT_COLUMNS];
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Faltan columnas CSV: ${missing.join(", ")}.`);
    if (!(headers.includes("codigo_local") || headers.includes("equipo_local"))
        || !(headers.includes("codigo_visitante") || headers.includes("equipo_visitante"))) {
        throw new Error("Incluye codigo_local/equipo_local y codigo_visitante/equipo_visitante.");
    }

    const rows = dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
    const matches = new Map<string, PlayerStatsImport["partidos"][number]>();
    let season: string | undefined;

    for (const row of rows) {
        const jornada = Number(row.jornada);
        if (!Number.isInteger(jornada) || jornada < 1) throw new Error("jornada debe ser un entero mayor que cero.");
        const home = teamName(row, "codigo_local", "equipo_local");
        const away = teamName(row, "codigo_visitante", "equipo_visitante");
        if (home !== "Bayern D.L.Caninos" && away !== "Bayern D.L.Caninos") {
            throw new Error("Las estadísticas de esta plantilla solo admiten partidos del Bayern D.L.Caninos.");
        }
        const currentSeason = String(row.temporada ?? "").trim() || DEFAULT_SEASON;
        if (season !== undefined && currentSeason !== season) throw new Error("Un archivo debe contener una sola temporada.");
        season = currentSeason;

        const key = [jornada, home, away].join("|");
        const match = matches.get(key) ?? {
            jornada,
            equipo_local: home,
            equipo_visitante: away,
            estadisticas: [],
        };
        matches.set(key, match);

        const rawStats = STAT_COLUMNS.map((column) => String(row[column] ?? "").trim());
        if (rawStats.every((value) => value === "")) continue;

        const jugadorId = String(row.jugador_id ?? "").trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jugadorId)) {
            throw new Error(`El jugador ${jugadorId || "(sin ID)"} no es un UUID válido.`);
        }
        const stats: PlayerMatchStatistics = {
            goles: asCount(String(row.goles ?? ""), "goles"),
            asistencias: asCount(String(row.asistencias ?? ""), "asistencias"),
            penaltis_marcados: asCount(String(row.penaltis_marcados ?? ""), "penaltis_marcados"),
            penaltis_tirados: asCount(String(row.penaltis_tirados ?? ""), "penaltis_tirados"),
            dobles_penaltis_marcados: asCount(String(row.dobles_penaltis_marcados ?? ""), "dobles_penaltis_marcados"),
            dobles_penaltis_tirados: asCount(String(row.dobles_penaltis_tirados ?? ""), "dobles_penaltis_tirados"),
            faltas_directas_marcadas: asCount(String(row.faltas_directas_marcadas ?? ""), "faltas_directas_marcadas"),
            amarillas: asCount(String(row.amarillas ?? ""), "amarillas"),
            rojas: asCount(String(row.rojas ?? ""), "rojas"),
        };
        if (stats.penaltis_marcados > stats.penaltis_tirados) {
            throw new Error("Los penaltis marcados no pueden superar los penaltis tirados.");
        }
        if (stats.dobles_penaltis_marcados > stats.dobles_penaltis_tirados) {
            throw new Error("Los dobles penaltis marcados no pueden superar los dobles penaltis tirados.");
        }
        if (Object.values(stats).every((value) => value === 0)) continue;

        if (match.estadisticas.some((item) => item.jugador_id === jugadorId)) {
            throw new Error(`El jugador ${jugadorId} aparece más de una vez en la jornada ${jornada}.`);
        }
        match.estadisticas.push({ jugador_id: jugadorId, ...stats });
    }

    if (matches.size === 0) throw new Error("Añade estadísticas de al menos un jugador usando su UUID.");
    return { temporada: season ?? DEFAULT_SEASON, partidos: [...matches.values()] };
}
