import { describe, expect, it } from "vitest";
import { EMPTY_FANTASY_EXTRA, buildFantasyRanking, concededPoints, scorePlayerMatch, type FantasyStats } from "@/lib/fantasy";

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
});
