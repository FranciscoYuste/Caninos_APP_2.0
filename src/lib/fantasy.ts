// Fantasy de los jugadores del Bayern: tabla de puntos y cálculo por partido.
// Solo cuentan los partidos del Bayern con resultado y convocatoria publicada.

export const FANTASY_ABSENCES = [
    { value: "injustificada", label: "Sin justificar" },
    { value: "justificada", label: "Lesión o fuerza mayor" },
    { value: "tecnica", label: "Decisión técnica" },
] as const;
export type FantasyAbsence = (typeof FANTASY_ABSENCES)[number]["value"];

export function isFantasyAbsence(value: unknown): value is FantasyAbsence {
    return FANTASY_ABSENCES.some((absence) => absence.value === value);
}

export const FANTASY_POINTS = {
    attended: 5,
    unjustifiedAbsence: -5,
    goal: 5,
    assist: 3,
    katsu: 3,
    penaltyWon: 2,
    penaltyScored: 1,
    penaltyMissed: -2,
    doublePenaltyScored: 2,
    doublePenaltyMissed: -1,
    penaltyConceded: -2,
    penaltyConcededGoal: -3,
    doublePenaltyAgainst: -1,
    penaltySaved: 3,
    doublePenaltySaved: 2,
    yellowCard: -1,
    doubleYellow: -3,
    directRed: -5,
    ownGoal: -3,
} as const;

// Goles encajados: el portero suma su columna y los jugadores de campo la del equipo.
// Sin tope: a partir de 3 goles, cada gol más resta 1.
export function concededPoints(goals: number, goalkeeper: boolean): number {
    if (goals <= 0) return goalkeeper ? 6 : 3;
    if (goals === 1) return goalkeeper ? 4 : 1;
    return 2 - goals;
}

// Datos de la tabla de reglas que se muestra en la web (y en el README).
export const FANTASY_RULES: Array<{ title: string; rows: Array<[string, number | string]> }> = [
    { title: "Asistencia", rows: [
        ["Ir al partido (convocado)", FANTASY_POINTS.attended],
        ["No ir sin justificar", FANTASY_POINTS.unjustifiedAbsence],
        ["No ir por lesión, fuerza mayor o decisión técnica", 0],
    ] },
    { title: "Ataque", rows: [
        ["Gol (de jugada o falta)", FANTASY_POINTS.goal],
        ["Asistencia", FANTASY_POINTS.assist],
        ["Jugador KATSU del partido", FANTASY_POINTS.katsu],
    ] },
    { title: "Penaltis a favor", rows: [
        ["Provocar un penalti", FANTASY_POINTS.penaltyWon],
        ["Penalti marcado (no suma como gol)", FANTASY_POINTS.penaltyScored],
        ["Penalti fallado", FANTASY_POINTS.penaltyMissed],
        ["Doble penalti marcado (no suma como gol)", FANTASY_POINTS.doublePenaltyScored],
        ["Doble penalti fallado", FANTASY_POINTS.doublePenaltyMissed],
    ] },
    { title: "Penaltis en contra", rows: [
        ["Cometer un penalti", FANTASY_POINTS.penaltyConceded],
        ["Cometer un penalti que acaba en gol (en total)", FANTASY_POINTS.penaltyConcededGoal],
        ["Doble penalti en contra (a todos los que jugaron)", FANTASY_POINTS.doublePenaltyAgainst],
        ["Portero: parar un penalti", FANTASY_POINTS.penaltySaved],
        ["Portero: parar un doble penalti", FANTASY_POINTS.doublePenaltySaved],
    ] },
    { title: "Disciplina", rows: [
        ["Amarilla", FANTASY_POINTS.yellowCard],
        ["Doble amarilla (en total)", FANTASY_POINTS.doubleYellow],
        ["Roja directa", FANTASY_POINTS.directRed],
        ["Gol en propia puerta", FANTASY_POINTS.ownGoal],
    ] },
];

export const FANTASY_CONCEDED_RULES = [0, 1, 2, 3, 4, 5].map((goals) => ({
    goals: goals === 5 ? "5 o más" : String(goals),
    goalkeeper: goals === 5 ? "−3, −1 más por gol" : concededPoints(goals, true),
    field: goals === 5 ? "−3, −1 más por gol" : concededPoints(goals, false),
}));

// Datos del jugador en el partido que ya existen en estadisticas.
export type FantasyStats = {
    goles: number;
    asistencias: number;
    penaltis_marcados: number;
    penaltis_tirados: number;
    dobles_penaltis_marcados: number;
    dobles_penaltis_tirados: number;
    amarillas: number;
    rojas: number;
};

// Datos propios del fantasy (tabla fantasy_partido).
export type FantasyExtra = {
    penaltis_provocados: number;
    penaltis_cometidos: number;
    penaltis_cometidos_gol: number;
    penaltis_parados: number;
    dobles_penaltis_parados: number;
    goles_propia: number;
};

export const EMPTY_FANTASY_EXTRA: FantasyExtra = {
    penaltis_provocados: 0,
    penaltis_cometidos: 0,
    penaltis_cometidos_gol: 0,
    penaltis_parados: 0,
    dobles_penaltis_parados: 0,
    goles_propia: 0,
};

export type FantasyPlayerMatch =
    | { calledUp: false; absence: FantasyAbsence }
    | {
        calledUp: true;
        goalkeeper: boolean;
        katsu: boolean;
        conceded: number;
        doublePenaltiesAgainst: number;
        stats: FantasyStats | null;
        extra: FantasyExtra | null;
    };

export type FantasyLine = { label: string; points: number };
export type FantasyScore = { total: number; lines: FantasyLine[] };

function times(count: number, label: string, each: number, lines: FantasyLine[]) {
    if (count > 0) lines.push({ label: count > 1 ? `${label} ×${count}` : label, points: count * each });
}

export function scorePlayerMatch(match: FantasyPlayerMatch): FantasyScore {
    const lines: FantasyLine[] = [];
    if (!match.calledUp) {
        if (match.absence === "injustificada") lines.push({ label: "No fue sin justificar", points: FANTASY_POINTS.unjustifiedAbsence });
        else lines.push({ label: match.absence === "tecnica" ? "No convocado (decisión técnica)" : "Ausencia justificada", points: 0 });
        return { total: lines.reduce((sum, line) => sum + line.points, 0), lines };
    }

    const stats = match.stats;
    const extra = match.extra ?? EMPTY_FANTASY_EXTRA;
    lines.push({ label: "Fue al partido", points: FANTASY_POINTS.attended });
    if (stats) {
        // Los goles de las estadísticas incluyen los de penalti y doble penalti, que puntúan aparte.
        const playGoals = Math.max(0, stats.goles - stats.penaltis_marcados - stats.dobles_penaltis_marcados);
        times(playGoals, "Gol", FANTASY_POINTS.goal, lines);
        times(stats.asistencias, "Asistencia", FANTASY_POINTS.assist, lines);
        times(stats.penaltis_marcados, "Penalti marcado", FANTASY_POINTS.penaltyScored, lines);
        times(stats.penaltis_tirados - stats.penaltis_marcados, "Penalti fallado", FANTASY_POINTS.penaltyMissed, lines);
        times(stats.dobles_penaltis_marcados, "Doble penalti marcado", FANTASY_POINTS.doublePenaltyScored, lines);
        times(stats.dobles_penaltis_tirados - stats.dobles_penaltis_marcados, "Doble penalti fallado", FANTASY_POINTS.doublePenaltyMissed, lines);
        // La doble amarilla se apunta como 2 amarillas; la roja que conlleva no resta aparte.
        if (stats.amarillas >= 2) lines.push({ label: "Doble amarilla", points: FANTASY_POINTS.doubleYellow });
        else {
            times(stats.amarillas, "Amarilla", FANTASY_POINTS.yellowCard, lines);
            times(stats.rojas, "Roja directa", FANTASY_POINTS.directRed, lines);
        }
    }
    if (match.katsu) lines.push({ label: "Jugador KATSU", points: FANTASY_POINTS.katsu });
    times(extra.penaltis_provocados, "Penalti provocado", FANTASY_POINTS.penaltyWon, lines);
    times(extra.penaltis_cometidos - extra.penaltis_cometidos_gol, "Penalti cometido", FANTASY_POINTS.penaltyConceded, lines);
    times(extra.penaltis_cometidos_gol, "Penalti cometido que acabó en gol", FANTASY_POINTS.penaltyConcededGoal, lines);
    times(extra.goles_propia, "Gol en propia", FANTASY_POINTS.ownGoal, lines);
    times(extra.penaltis_parados, "Penalti parado", FANTASY_POINTS.penaltySaved, lines);
    times(extra.dobles_penaltis_parados, "Doble penalti parado", FANTASY_POINTS.doublePenaltySaved, lines);
    times(match.doublePenaltiesAgainst, "Doble penalti en contra", FANTASY_POINTS.doublePenaltyAgainst, lines);
    lines.push({
        label: `${match.conceded === 1 ? "1 gol encajado" : `${match.conceded} goles encajados`}${match.goalkeeper ? " (portero)" : ""}`,
        points: concededPoints(match.conceded, match.goalkeeper),
    });
    return { total: lines.reduce((sum, line) => sum + line.points, 0), lines };
}

export function formatPoints(points: number): string {
    return points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "0";
}

// --- Ranking de una competición -------------------------------------------------------------

export type FantasyInputPlayer = { id: string; name: string; number: number | null; position: string; active: boolean };
export type FantasyInputMatch = {
    id: string;
    jornada: number;
    opponent: string;
    score: string;
    conceded: number;
    katsuId: string | null;
    doublePenaltiesAgainst: number;
    calledUp: Set<string>;
};
export type FantasyInputRow = FantasyExtra & { partido_id: string; jugador_id: string; ausencia: FantasyAbsence | null; portero: boolean };

export type FantasyPlayerRow = {
    id: string;
    name: string;
    number: number | null;
    total: number;
    played: number;
    matches: Array<{ id: string; jornada: number; opponent: string; score: string; total: number; lines: FantasyLine[] }>;
};

// Partidos: solo los del Bayern con resultado y convocatoria publicada. Jugadores: la plantilla
// de la competición; las ausencias solo cuentan para jugadores activos (quien ya se fue del
// equipo no pierde puntos por los partidos posteriores).
export function buildFantasyRanking({ players, matches, stats, rows }: {
    players: FantasyInputPlayer[];
    matches: FantasyInputMatch[];
    stats: Map<string, FantasyStats>;
    rows: FantasyInputRow[];
}): FantasyPlayerRow[] {
    const rowByKey = new Map(rows.map((row) => [`${row.partido_id}:${row.jugador_id}`, row]));
    const ordered = [...matches].sort((a, b) => a.jornada - b.jornada);
    const ranking = players.map((player): FantasyPlayerRow => {
        const playerMatches: FantasyPlayerRow["matches"] = [];
        for (const match of ordered) {
            const row = rowByKey.get(`${match.id}:${player.id}`);
            const calledUp = match.calledUp.has(player.id);
            if (!calledUp && !player.active) continue;
            // Portero del partido: los marcados en el admin o, si no hay ninguno, los convocados con posición Portero.
            const markedKeepers = rows.some((item) => item.partido_id === match.id && item.portero);
            const goalkeeper = markedKeepers ? Boolean(row?.portero) : player.position === "Portero";
            const score = calledUp
                ? scorePlayerMatch({
                    calledUp: true,
                    goalkeeper,
                    katsu: match.katsuId === player.id,
                    conceded: match.conceded,
                    doublePenaltiesAgainst: match.doublePenaltiesAgainst,
                    stats: stats.get(`${match.id}:${player.id}`) ?? null,
                    extra: row ?? null,
                })
                : scorePlayerMatch({ calledUp: false, absence: row?.ausencia ?? "injustificada" });
            playerMatches.push({ id: match.id, jornada: match.jornada, opponent: match.opponent, score: match.score, ...score });
        }
        return {
            id: player.id,
            name: player.name,
            number: player.number,
            total: playerMatches.reduce((sum, match) => sum + match.total, 0),
            played: ordered.filter((match) => match.calledUp.has(player.id)).length,
            matches: playerMatches,
        };
    });
    return ranking
        .filter((player) => player.matches.length)
        .sort((a, b) => b.total - a.total || b.played - a.played || a.name.localeCompare(b.name, "es"));
}
