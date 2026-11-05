import { describe, expect, it } from "vitest";
import { EMPTY_FANTASY_EXTRA, buildFantasyRanking, categoryTotals, concededPoints, latestHighlight, scorePlayerMatch, type FantasyStats } from "@/lib/fantasy";

const NO_STATS: FantasyStats = { goles: 0, asistencias: 0, penaltis_marcados: 0, penaltis_tirados: 0, dobles_penaltis_marcados: 0, dobles_penaltis_tirados: 0, amarillas: 0, rojas: 0 };
const played = (overrides: Partial<Parameters<typeof scorePlayerMatch>[0] & { calledUp: true }> = {}) => scorePlayerMatch({
    calledUp: true, goalkeeper: false, katsu: false, conceded: 2, doublePenaltiesAgainst: 0, stats: null, extra: null, ...overrides,
});

describe("concededPoints", () => {
    it("sigue las dos columnas sin tope", () => {
        expect([0, 1, 2, 3, 4, 5, 8].map((goals) => concededPoints(goals, true))).toEqual([6, 4, 0, -1, -2, -3, -6]);
        expect([0, 1, 2, 3, 4, 5, 8].map((goals) => concededPoints(goals, false))).toEqual([3, 1, 0, -1, -2, -3, -6]);
    });
});

describe("scorePlayerMatch", () => {
    it("puntúa las ausencias", () => {
        expect(scorePlayerMatch({ calledUp: false, absence: "injustificada" }).total).toBe(-5);
        expect(scorePlayerMatch({ calledUp: false, absence: "justificada" }).total).toBe(0);
        expect(scorePlayerMatch({ calledUp: false, absence: "tecnica" }).total).toBe(0);
    });

    it("ir al partido sin hacer nada y encajar 2 son 5 puntos", () => {
        expect(played().total).toBe(5);
    });

    it("los goles de penalti y doble penalti no puntúan como gol", () => {
        const stats = { ...NO_STATS, goles: 3, penaltis_marcados: 1, penaltis_tirados: 2, dobles_penaltis_marcados: 1, dobles_penaltis_tirados: 1 };
        // 5 ir + 5 gol de jugada + 1 penalti − 2 fallado + 2 doble penalti
        expect(played({ stats }).total).toBe(11);
    });

    it("la doble amarilla resta 3 en total aunque se apunte también la roja", () => {
        expect(played({ stats: { ...NO_STATS, amarillas: 2, rojas: 1 } }).total).toBe(2);
        expect(played({ stats: { ...NO_STATS, amarillas: 1 } }).total).toBe(4);
        expect(played({ stats: { ...NO_STATS, rojas: 1 } }).total).toBe(0);
    });

    it("suma lo propio del fantasy", () => {
        const extra = { ...EMPTY_FANTASY_EXTRA, penaltis_provocados: 1, penaltis_cometidos: 2, penaltis_cometidos_gol: 1, goles_propia: 1 };
        // 5 + 2 provocado − 2 cometido − 3 cometido con gol − 3 propia − 1 doble penalti en contra
        expect(played({ extra, doublePenaltiesAgainst: 1 }).total).toBe(-2);
    });

    it("el portero usa su columna y suma paradas y KATSU", () => {
        const extra = { ...EMPTY_FANTASY_EXTRA, penaltis_parados: 1, dobles_penaltis_parados: 1 };
        // 5 + 6 portería a cero + 3 + 2 + 3 KATSU
        expect(played({ goalkeeper: true, conceded: 0, katsu: true, extra }).total).toBe(19);
    });
});

describe("buildFantasyRanking", () => {
    const players = [
        { id: "a", name: "Ana", number: 1, position: "Portero", active: true },
        { id: "b", name: "Bea", number: 2, position: "Cierre", active: true },
        { id: "c", name: "Cris", number: 3, position: "Pívot", active: true },
        { id: "d", name: "Dani", number: 4, position: "Pívot", active: false },
    ];
    const match = { id: "m1", jornada: 1, opponent: "Rival", score: "3-0", conceded: 0, katsuId: "b", doublePenaltiesAgainst: 0, calledUp: new Set(["a", "b"]) };

    it("calcula convocados, ausencias e ignora a los que ya no están", () => {
        const stats = new Map([["m1:b", { ...NO_STATS, goles: 1 }]]);
        const ranking = buildFantasyRanking({ players, matches: [match], stats, rows: [] });
        expect(ranking.map((row) => [row.name, row.total])).toEqual([["Bea", 16], ["Ana", 11], ["Cris", -5]]);
    });

    it("respeta la ausencia justificada y el portero marcado", () => {
        const rows = [
            { partido_id: "m1", jugador_id: "c", ausencia: "justificada" as const, portero: false, ...EMPTY_FANTASY_EXTRA },
            { partido_id: "m1", jugador_id: "b", ausencia: null, portero: true, ...EMPTY_FANTASY_EXTRA },
        ];
        const ranking = buildFantasyRanking({ players, matches: [match], stats: new Map(), rows });
        const total = (name: string) => ranking.find((row) => row.name === name)?.total;
        expect(total("Cris")).toBe(0);
        expect(total("Bea")).toBe(14); // 5 + 6 portero + 3 KATSU
        expect(total("Ana")).toBe(8); // ya no es la portera: columna de campo
    });

    it("calcula puestos con empates y las flechas respecto al partido anterior", () => {
        const second = { id: "m2", jornada: 2, opponent: "Otro", score: "0-4", conceded: 4, katsuId: "c", doublePenaltiesAgainst: 0, calledUp: new Set(["b", "c"]) };
        const stats = new Map([["m2:c", { ...NO_STATS, goles: 3 }]]);
        const ranking = buildFantasyRanking({ players, matches: [second, match], stats, rows: [] });
        // Tras J1: Bea 11 y Ana 11 (empatadas 1ª), Cris −5 (3º). J2: Cris 21, Bea 3, Ana −5.
        expect(ranking.map((row) => [row.name, row.total, row.rank, row.movement])).toEqual([
            ["Cris", 16, 1, 2],
            ["Bea", 14, 2, -1],
            ["Ana", 6, 3, -2],
        ]);
        const best = latestHighlight(ranking);
        expect([best?.player.name, best?.match.jornada, best?.match.total]).toEqual(["Cris", 2, 21]);
    });

    it("sin partido anterior no hay flechas", () => {
        const ranking = buildFantasyRanking({ players, matches: [match], stats: new Map(), rows: [] });
        expect(ranking.every((row) => row.movement === null)).toBe(true);
    });
});

describe("categoryTotals", () => {
    it("reparte los puntos por categoría y suma el total", () => {
        const score = played({ stats: { ...NO_STATS, goles: 1, amarillas: 1 }, katsu: true, conceded: 0 });
        const totals = categoryTotals([{ id: "m", jornada: 1, opponent: "X", score: "1-0", ...score }]);
        expect(Object.fromEntries(totals.map((item) => [item.id, item.points]))).toEqual({ asistencia: 5, ataque: 8, penaltis: 0, defensa: 3, disciplina: -1 });
        expect(totals.reduce((sum, item) => sum + item.points, 0)).toBe(score.total);
    });
});
