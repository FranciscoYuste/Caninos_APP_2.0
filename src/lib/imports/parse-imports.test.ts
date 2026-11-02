import { describe, expect, it } from "vitest";
import { FEATURED_TEAM } from "@/lib/config";
import { parseConvocatoriaCsv as parseCallups } from "@/lib/imports/parse-convocatoria";
import { parseCsvRows, parseJornadaCsv as parseResults, parseJornadaFile as parseResultsFile, type ImportContext } from "@/lib/imports/parse-jornada";
import { parsePlayerRosterCsv } from "@/lib/imports/parse-player-roster";
import { parsePlayerStatsCsv as parseStats } from "@/lib/imports/parse-player-stats";

const ACTIVE_SEASON = "2026-2027";
const CONTEXT: ImportContext = {
    season: ACTIVE_SEASON,
    teamCodes: { BAY: FEATURED_TEAM, SEV: "Severo Torrejon", TOR: "Torrejon United", LOC: "Locotroes", BLC: "Barrio La Cañada" },
};
const parseJornadaCsv = (text: string) => parseResults(text, CONTEXT);
const parseJornadaFile = (text: string, filename: string) => parseResultsFile(text, filename, CONTEXT);
const parseConvocatoriaCsv = (text: string) => parseCallups(text, CONTEXT);
const parsePlayerStatsCsv = (text: string) => parseStats(text, CONTEXT);

const PLAYER_A = "11111111-1111-4111-8111-111111111111";
const PLAYER_B = "22222222-2222-4222-8222-222222222222";

describe("parseCsvRows", () => {
    it("detecta punto y coma, elimina el BOM y respeta comillas escapadas", () => {
        const rows = parseCsvRows('﻿a;b\r\n"x;1";"di ""hola"""\r\n');
        expect(rows).toEqual([["a", "b"], ["x;1", 'di "hola"']]);
    });

    it("acepta comas como separador", () => {
        expect(parseCsvRows("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
    });

    it("ignora filas vacías y exige al menos una fila de datos", () => {
        expect(() => parseCsvRows("a;b\n;\n")).toThrow("al menos una fila");
    });

    it("rechaza comillas sin cerrar", () => {
        expect(() => parseCsvRows('a;b\n"x;1')).toThrow("comilla sin cerrar");
    });
});

describe("parseJornadaCsv", () => {
    it("traduce los códigos de equipo y deja pendientes los partidos sin goles", () => {
        const result = parseJornadaCsv([
            "temporada;jornada;codigo_local;codigo_visitante;goles_local;goles_visitante",
            `${ACTIVE_SEASON};1;BAY;SEV;3;1`,
            `${ACTIVE_SEASON};1;TOR;LOC;;`,
        ].join("\n"));
        expect(result.temporada).toBe(ACTIVE_SEASON);
        expect(result.partidos).toEqual([
            expect.objectContaining({ jornada: 1, equipo_local: FEATURED_TEAM, equipo_visitante: "Severo Torrejon", goles_local: 3, goles_visitante: 1 }),
            expect.objectContaining({ equipo_local: "Torrejon United", equipo_visitante: "Locotroes", goles_local: null, goles_visitante: null }),
        ]);
    });

    it("exige los goles de ambos equipos o ninguno", () => {
        expect(() => parseJornadaCsv("jornada;codigo_local;codigo_visitante;goles_local;goles_visitante\n1;BAY;SEV;2;"))
            .toThrow("goles de ambos equipos");
    });

    it("rechaza códigos de equipo desconocidos", () => {
        expect(() => parseJornadaCsv("jornada;codigo_local;codigo_visitante;goles_local;goles_visitante\n1;XXX;SEV;;"))
            .toThrow("Código de equipo no válido");
    });

    it("rechaza varias temporadas en un mismo archivo", () => {
        expect(() => parseJornadaCsv([
            "temporada;jornada;codigo_local;codigo_visitante;goles_local;goles_visitante",
            "2026-2027;1;BAY;SEV;;",
            "2027-2028;2;BAY;LOC;;",
        ].join("\n"))).toThrow("una sola temporada");
    });

    it("solo admite archivos .csv o .json", () => {
        expect(() => parseJornadaFile("", "resultados.xlsx")).toThrow("Formato no soportado");
    });
});

describe("parseConvocatoriaCsv", () => {
    const header = "temporada;jornada;codigo_local;codigo_visitante;fecha;hora;campo;jugador_id;convocado";

    it("agrupa jugadores por partido y normaliza fecha y hora", () => {
        const result = parseConvocatoriaCsv([
            header,
            `${ACTIVE_SEASON};1;BAY;SEV;15/11/2026;9:30;Pabellón;${PLAYER_A};sí`,
            `${ACTIVE_SEASON};1;BAY;SEV;;;;${PLAYER_B};no`,
        ].join("\n"));
        expect(result.partidos).toHaveLength(1);
        expect(result.partidos[0]).toMatchObject({
            jornada: 1,
            fecha: "2026-11-15",
            hora: "09:30:00",
            campo: "Pabellón",
            actualizar_convocatoria: true,
            jugadores: [{ jugador_id: PLAYER_A, convocado: true }, { jugador_id: PLAYER_B, convocado: false }],
        });
    });

    it("omite los partidos sin convocatoria ni horario", () => {
        const result = parseConvocatoriaCsv([
            header,
            `${ACTIVE_SEASON};1;BAY;SEV;;;;${PLAYER_A};sí`,
            `${ACTIVE_SEASON};2;BLC;BAY;;;;${PLAYER_A};`,
        ].join("\n"));
        expect(result.partidos.map((match) => match.jornada)).toEqual([1]);
    });

    it("exige fecha y hora a la vez", () => {
        expect(() => parseConvocatoriaCsv(`${header}\n${ACTIVE_SEASON};1;BAY;SEV;15/11/2026;;;${PLAYER_A};sí`))
            .toThrow("Completa fecha y hora");
    });

    it("solo admite partidos del equipo", () => {
        expect(() => parseConvocatoriaCsv(`${header}\n${ACTIVE_SEASON};1;TOR;SEV;;;;${PLAYER_A};sí`))
            .toThrow(FEATURED_TEAM);
    });

    it("rechaza valores de convocado desconocidos", () => {
        expect(() => parseConvocatoriaCsv(`${header}\n${ACTIVE_SEASON};1;BAY;SEV;;;;${PLAYER_A};quizá`))
            .toThrow("Valor no válido para convocado");
    });
});

describe("parsePlayerStatsCsv", () => {
    const header = "temporada;jornada;codigo_local;codigo_visitante;jugador_id;goles;asistencias;penaltis_marcados;penaltis_tirados;dobles_penaltis_marcados;dobles_penaltis_tirados;faltas_directas_marcadas;amarillas;rojas";

    it("ignora filas vacías o a cero y conserva el partido", () => {
        const result = parsePlayerStatsCsv([
            header,
            `${ACTIVE_SEASON};1;BAY;SEV;${PLAYER_A};2;1;1;1;;;;1;`,
            `${ACTIVE_SEASON};1;BAY;SEV;${PLAYER_B};0;0;0;0;0;0;0;0;0`,
            `${ACTIVE_SEASON};2;BLC;BAY;;;;;;;;;;`,
        ].join("\n"));
        expect(result.partidos).toHaveLength(2);
        expect(result.partidos[0].estadisticas).toEqual([
            { jugador_id: PLAYER_A, goles: 2, asistencias: 1, penaltis_marcados: 1, penaltis_tirados: 1, dobles_penaltis_marcados: 0, dobles_penaltis_tirados: 0, faltas_directas_marcadas: 0, amarillas: 1, rojas: 0 },
        ]);
        expect(result.partidos[1].estadisticas).toEqual([]);
    });

    it("no permite más penaltis marcados que tirados", () => {
        expect(() => parsePlayerStatsCsv(`${header}\n${ACTIVE_SEASON};1;BAY;SEV;${PLAYER_A};0;0;2;1;0;0;0;0;0`))
            .toThrow("penaltis marcados");
    });

    it("rechaza jugadores repetidos en la misma jornada", () => {
        expect(() => parsePlayerStatsCsv([
            header,
            `${ACTIVE_SEASON};1;BAY;SEV;${PLAYER_A};1;0;0;0;0;0;0;0;0`,
            `${ACTIVE_SEASON};1;BAY;SEV;${PLAYER_A};1;0;0;0;0;0;0;0;0`,
        ].join("\n"))).toThrow("más de una vez");
    });
});

describe("parsePlayerRosterCsv", () => {
    it("normaliza posiciones sin tildes y admite dorsal vacío", () => {
        expect(parsePlayerRosterCsv(`jugador_id;dorsal;posicion\n${PLAYER_A};7;pivot\n${PLAYER_B};;Por definir`)).toEqual([
            { jugador_id: PLAYER_A, dorsal: 7, posicion: "Pívot" },
            { jugador_id: PLAYER_B, dorsal: null, posicion: "Por definir" },
        ]);
    });

    it("rechaza dorsales repetidos", () => {
        expect(() => parsePlayerRosterCsv(`jugador_id;dorsal;posicion\n${PLAYER_A};7;Cierre\n${PLAYER_B};7;Portero`))
            .toThrow("dorsal 7");
    });

    it("rechaza posiciones desconocidas", () => {
        expect(() => parsePlayerRosterCsv(`jugador_id;dorsal;posicion\n${PLAYER_A};7;Delantero`)).toThrow("Posición no válida");
    });
});
