import { parseCsvRows } from "@/lib/imports/parse-jornada";

export type ImportedPlayerProfile = {
    jugador_id: string;
    dorsal: number | null;
    posicion: string;
};

const POSITIONS: Record<string, string> = {
    portero: "Portero",
    cierre: "Cierre",
    "ala izquierda": "Ala izquierda",
    "ala derecha": "Ala derecha",
    pivot: "Pívot",
    "por definir": "Por definir",
};

export function parsePlayerRosterCsv(text: string): ImportedPlayerProfile[] {
    const [rawHeaders, ...dataRows] = parseCsvRows(text);
    const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
    const requiredHeaders = ["jugador_id", "dorsal", "posicion"];
    const missing = requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Faltan columnas CSV: ${missing.join(", ")}.`);

    const seenIds = new Set<string>();
    const seenDorsals = new Set<number>();
    const players = dataRows.map((cells, index) => {
        const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
        const jugadorId = String(row.jugador_id ?? "").trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jugadorId)) {
            throw new Error(`El UUID del jugador de la fila ${index + 2} no es válido.`);
        }
        const normalizedId = jugadorId.toLowerCase();
        if (seenIds.has(normalizedId)) throw new Error(`El jugador ${jugadorId} aparece más de una vez.`);
        seenIds.add(normalizedId);

        const rawNumber = String(row.dorsal ?? "").trim();
        const dorsal = rawNumber ? Number(rawNumber) : null;
        if (dorsal !== null && (!Number.isInteger(dorsal) || dorsal < 0 || dorsal > 99)) {
            throw new Error(`El dorsal de la fila ${index + 2} debe ser un entero entre 0 y 99 o quedar vacío.`);
        }
        if (dorsal !== null && seenDorsals.has(dorsal)) throw new Error(`El dorsal ${dorsal} está asignado a más de un jugador.`);
        if (dorsal !== null) seenDorsals.add(dorsal);

        const rawPosition = String(row.posicion ?? "").trim();
        const positionKey = rawPosition.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const posicion = POSITIONS[positionKey];
        if (!posicion) {
            throw new Error(`Posición no válida en la fila ${index + 2}. Usa Portero, Cierre, Ala izquierda, Ala derecha, Pívot o Por definir.`);
        }
        return { jugador_id: jugadorId, dorsal, posicion };
    });

    if (!players.length) throw new Error("El archivo no contiene jugadores para actualizar.");
    return players;
}
