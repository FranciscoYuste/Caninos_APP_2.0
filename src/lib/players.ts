// Datos de jugadores compartidos por el admin, los CSV y las rutas de la API.
export const PLAYER_POSITIONS = ["Portero", "Cierre", "Ala izquierda", "Ala derecha", "Pívot", "Por definir"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const MAX_PLAYER_NAME_LENGTH = 40;

export function isPlayerPosition(value: unknown): value is PlayerPosition {
    return typeof value === "string" && (PLAYER_POSITIONS as readonly string[]).includes(value);
}

// Columnas de estadisticas que se registran por jugador y partido, con su etiqueta en el admin.
export const MATCH_STAT_FIELDS = [
    { key: "goles", label: "Goles" },
    { key: "asistencias", label: "Asistencias" },
    { key: "amarillas", label: "Amarillas" },
    { key: "rojas", label: "Rojas" },
    { key: "penaltis_marcados", label: "Penaltis marcados" },
    { key: "penaltis_tirados", label: "Penaltis tirados" },
    { key: "dobles_penaltis_marcados", label: "Dobles penaltis marcados" },
    { key: "dobles_penaltis_tirados", label: "Dobles penaltis tirados" },
    { key: "faltas_directas_marcadas", label: "Faltas directas marcadas" },
] as const;
export type MatchStatKey = (typeof MATCH_STAT_FIELDS)[number]["key"];
export type MatchStatLine = Record<MatchStatKey, number>;

export const EMPTY_STAT_LINE: MatchStatLine = Object.fromEntries(MATCH_STAT_FIELDS.map(({ key }) => [key, 0])) as MatchStatLine;

export function hasStats(line: MatchStatLine): boolean {
    return MATCH_STAT_FIELDS.some(({ key }) => line[key] > 0);
}
