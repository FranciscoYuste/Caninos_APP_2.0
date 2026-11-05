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
        ["Ir al partido", FANTASY_POINTS.attended],
        ["No ir sin justificar", FANTASY_POINTS.unjustifiedAbsence],
        ["No ir por lesión, fuerza mayor o decisión técnica", 0],
    ] },
    { title: "Ataque", rows: [
        ["Gol", FANTASY_POINTS.goal],
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
        ["Portero para un penalti", FANTASY_POINTS.penaltySaved],
        ["Portero para un doble penalti", FANTASY_POINTS.doublePenaltySaved],
    ] },
    { title: "Disciplina", rows: [
        ["Amarilla", FANTASY_POINTS.yellowCard],
        ["Doble amarilla (en total)", FANTASY_POINTS.doubleYellow],
        ["Roja directa", FANTASY_POINTS.directRed],
        ["Gol en propia puerta", FANTASY_POINTS.ownGoal],
    ] },
];

export const FANTASY_CONCEDED_RULES = [0, 1, 2, 3, 4, 5, 6].map((goals) => ({
    goals: goals === 6 ? "6 o más" : String(goals),
    goalkeeper: goals === 6 ? "−1 más por gol" : concededPoints(goals, true),
    field: goals === 6 ? "−1 más por gol" : concededPoints(goals, false),
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

// Categorías para ver de dónde salen los puntos de cada jugador.
export const FANTASY_CATEGORIES = [
    { id: "asistencia", label: "Ir a los partidos" },
    { id: "ataque", label: "Goles, asistencias y KATSU" },
    { id: "penaltis", label: "Penaltis" },
    { id: "defensa", label: "Goles encajados y paradas" },
    { id: "disciplina", label: "Tarjetas y goles en propia" },
] as const;
export type FantasyCategory = (typeof FANTASY_CATEGORIES)[number]["id"];

export type FantasyLine = { label: string; points: number; category: FantasyCategory };
export type FantasyScore = { total: number; lines: FantasyLine[] };

function times(count: number, label: string, each: number, category: FantasyCategory, lines: FantasyLine[]) {
    if (count > 0) lines.push({ label: count > 1 ? `${label} ×${count}` : label, points: count * each, category });
}

export function scorePlayerMatch(match: FantasyPlayerMatch): FantasyScore {
    const lines: FantasyLine[] = [];
    if (!match.calledUp) {
        if (match.absence === "injustificada") lines.push({ label: "No fue sin justificar", points: FANTASY_POINTS.unjustifiedAbsence, category: "asistencia" });
        else lines.push({ label: match.absence === "tecnica" ? "No convocado (decisión técnica)" : "Ausencia justificada", points: 0, category: "asistencia" });
        return { total: lines.reduce((sum, line) => sum + line.points, 0), lines };
    }

    const stats = match.stats;
    const extra = match.extra ?? EMPTY_FANTASY_EXTRA;
    lines.push({ label: "Fue al partido", points: FANTASY_POINTS.attended, category: "asistencia" });
    if (stats) {
        // Los goles de las estadísticas incluyen los de penalti y doble penalti, que puntúan aparte.
        const playGoals = Math.max(0, stats.goles - stats.penaltis_marcados - stats.dobles_penaltis_marcados);
        times(playGoals, "Gol", FANTASY_POINTS.goal, "ataque", lines);
        times(stats.asistencias, "Asistencia", FANTASY_POINTS.assist, "ataque", lines);
        times(stats.penaltis_marcados, "Penalti marcado", FANTASY_POINTS.penaltyScored, "penaltis", lines);
        times(stats.penaltis_tirados - stats.penaltis_marcados, "Penalti fallado", FANTASY_POINTS.penaltyMissed, "penaltis", lines);
        times(stats.dobles_penaltis_marcados, "Doble penalti marcado", FANTASY_POINTS.doublePenaltyScored, "penaltis", lines);
        times(stats.dobles_penaltis_tirados - stats.dobles_penaltis_marcados, "Doble penalti fallado", FANTASY_POINTS.doublePenaltyMissed, "penaltis", lines);
        // La doble amarilla se apunta como 2 amarillas; la roja que conlleva no resta aparte.
        if (stats.amarillas >= 2) lines.push({ label: "Doble amarilla", points: FANTASY_POINTS.doubleYellow, category: "disciplina" });
        else {
            times(stats.amarillas, "Amarilla", FANTASY_POINTS.yellowCard, "disciplina", lines);
            times(stats.rojas, "Roja directa", FANTASY_POINTS.directRed, "disciplina", lines);
        }
    }
    if (match.katsu) lines.push({ label: "Jugador KATSU", points: FANTASY_POINTS.katsu, category: "ataque" });
    times(extra.penaltis_provocados, "Penalti provocado", FANTASY_POINTS.penaltyWon, "penaltis", lines);
    times(extra.penaltis_cometidos - extra.penaltis_cometidos_gol, "Penalti cometido", FANTASY_POINTS.penaltyConceded, "penaltis", lines);
    times(extra.penaltis_cometidos_gol, "Penalti cometido que acabó en gol", FANTASY_POINTS.penaltyConcededGoal, "penaltis", lines);
    times(extra.goles_propia, "Gol en propia", FANTASY_POINTS.ownGoal, "disciplina", lines);
    times(extra.penaltis_parados, "Penalti parado", FANTASY_POINTS.penaltySaved, "defensa", lines);
    times(extra.dobles_penaltis_parados, "Doble penalti parado", FANTASY_POINTS.doublePenaltySaved, "defensa", lines);
    times(match.doublePenaltiesAgainst, "Doble penalti en contra", FANTASY_POINTS.doublePenaltyAgainst, "penaltis", lines);
    lines.push({
        label: `${match.conceded === 1 ? "1 gol encajado" : `${match.conceded} goles encajados`}${match.goalkeeper ? " (portero)" : ""}`,
        points: concededPoints(match.conceded, match.goalkeeper),
        category: "defensa",
    });
    return { total: lines.reduce((sum, line) => sum + line.points, 0), lines };
}

export function formatPoints(points: number): string {
    return points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "0";
}

// --- Ranking de una competición -------------------------------------------------------------

export type FantasyInputPlayer = { id: string; name: string; number: number | null; position: string; active: boolean; photo?: string | null; video?: string | null };
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

// played: fue convocado a ese partido.
export type FantasyMatchScore = { id: string; jornada: number; opponent: string; score: string; played: boolean; total: number; lines: FantasyLine[] };
export type FantasyPlayerRow = {
    id: string;
    name: string;
    number: number | null;
    photo: string | null;
    video: string | null;
    total: number;
    played: number;
    // Puesto (los empatados lo comparten) y cuántos puestos ha subido (+) o bajado (−) respecto a
    // la jornada anterior; null si no estaba en el ranking antes o es la primera jornada.
    rank: number;
    movement: number | null;
    matches: FantasyMatchScore[];
};

// Puesto de cada total: 1 + cuántos tienen más puntos.
function ranks(totals: Map<string, number>): Map<string, number> {
    const values = [...totals.values()];
    return new Map([...totals].map(([id, total]) => [id, 1 + values.filter((value) => value > total).length]));
}

const sumPoints = (matches: FantasyMatchScore[]) => matches.reduce((sum, match) => sum + match.total, 0);

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
    const lastJornada = ordered.at(-1)?.jornada;
    const scored = players.map((player) => {
        const playerMatches: FantasyMatchScore[] = [];
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
            playerMatches.push({ id: match.id, jornada: match.jornada, opponent: match.opponent, score: match.score, played: calledUp, ...score });
        }
        return { player, matches: playerMatches };
    }).filter((item) => item.matches.length);

    const full = scored.map(({ player, matches: list }): FantasyPlayerRow => ({
        id: player.id,
        name: player.name,
        number: player.number,
        photo: player.photo ?? null,
        video: player.video ?? null,
        total: 0,
        played: 0,
        rank: 0,
        movement: null,
        matches: list,
    }));
    return lastJornada === undefined ? [] : rankingAt(full, lastJornada);
}

// Jornadas puntuadas, de la primera a la última.
export function fantasyJornadas(ranking: FantasyPlayerRow[]): number[] {
    return [...new Set(ranking.flatMap((player) => player.matches.map((match) => match.jornada)))].sort((a, b) => a - b);
}

// Clasificación tal como estaba al terminar una jornada: solo cuentan los partidos hasta ella y las
// flechas comparan con la jornada puntuada anterior. Recibe el ranking con todos los partidos.
export function rankingAt(ranking: FantasyPlayerRow[], jornada: number): FantasyPlayerRow[] {
    const previousJornada = fantasyJornadas(ranking).filter((item) => item < jornada).at(-1);
    const cut = (limit: number) => ranking
        .map((player) => ({ player, matches: player.matches.filter((match) => match.jornada <= limit) }))
        .filter(({ matches: list }) => list.length);
    const now = cut(jornada);
    const rankNow = ranks(new Map(now.map(({ player, matches: list }) => [player.id, sumPoints(list)])));
    const rankBefore = previousJornada === undefined
        ? new Map<string, number>()
        : ranks(new Map(cut(previousJornada).map(({ player, matches: list }) => [player.id, sumPoints(list)])));

    return now.map(({ player, matches: list }): FantasyPlayerRow => {
        const rank = rankNow.get(player.id) ?? 0;
        const previous = rankBefore.get(player.id);
        return {
            ...player,
            total: sumPoints(list),
            played: list.filter((match) => match.played).length,
            rank,
            movement: previous === undefined ? null : previous - rank,
            matches: list,
        };
    }).sort((a, b) => b.total - a.total || b.played - a.played || a.name.localeCompare(b.name, "es"));
}

// Puesto del jugador al terminar cada jornada.
export function rankHistory(ranking: FantasyPlayerRow[], playerId: string): Map<number, number> {
    return new Map(fantasyJornadas(ranking).flatMap((jornada) => {
        const rank = rankingAt(ranking, jornada).find((player) => player.id === playerId)?.rank;
        return rank === undefined ? [] : [[jornada, rank] as const];
    }));
}

// El que más puntos sumó en el último partido puntuado (a igualdad, el mejor del ranking).
export function latestHighlight(ranking: FantasyPlayerRow[]): { player: FantasyPlayerRow; match: FantasyMatchScore } | null {
    const jornadas = ranking.flatMap((player) => player.matches.map((match) => match.jornada));
    if (!jornadas.length) return null;
    const lastJornada = Math.max(...jornadas);
    let best: { player: FantasyPlayerRow; match: FantasyMatchScore } | null = null;
    for (const player of ranking) {
        const match = player.matches.find((item) => item.jornada === lastJornada);
        if (match && (!best || match.total > best.match.total)) best = { player, match };
    }
    return best;
}

// Puntos netos de un jugador por categoría, en el orden de FANTASY_CATEGORIES.
export function categoryTotals(matches: FantasyMatchScore[]): Array<{ id: FantasyCategory; label: string; points: number }> {
    return FANTASY_CATEGORIES.map(({ id, label }) => ({
        id,
        label,
        points: matches.reduce((sum, match) => sum + match.lines.reduce((total, line) => total + (line.category === id ? line.points : 0), 0), 0),
    }));
}
