import { describe, expect, it } from "vitest";
import { buildCalendarEvent } from "@/lib/ics";
import { recentForm } from "@/lib/team-form";
import type { RoundMatchItem } from "@/lib/team-types";

const match = (jornada: number, home: string, away: string, homeGoals: number | null, awayGoals: number | null): RoundMatchItem => ({
    key: `${jornada}-${home}`, jornada, home, away, homeGoals, awayGoals, score: "",
});

describe("recentForm", () => {
    it("devuelve los últimos resultados en orden de jornada desde el punto de vista del equipo", () => {
        const matches = [
            match(3, "Rival", "Bayern", 2, 2),
            match(1, "Bayern", "Rival", 3, 0),
            match(2, "Otro", "Bayern", 4, 1),
            match(4, "Bayern", "Otro", null, null),
            match(2, "Rival", "Otro", 1, 0),
        ];
        expect(recentForm(matches, "Bayern")).toEqual(["V", "D", "E"]);
    });

    it("se queda con los N más recientes", () => {
        const matches = [1, 2, 3, 4, 5, 6].map((jornada) => match(jornada, "Bayern", "Rival", jornada, 3));
        expect(recentForm(matches, "Bayern", 3)).toEqual(["V", "V", "V"]);
        expect(recentForm(matches, "Bayern")).toEqual(["D", "E", "V", "V", "V"]);
    });
});

describe("buildCalendarEvent", () => {
    it("genera un evento en UTC con texto escapado y saltos CRLF", () => {
        const ics = buildCalendarEvent({
            uid: "abc@caninos",
            start: new Date("2026-11-15T09:30:00Z"),
            durationMinutes: 60,
            title: "J5 · Bayern vs Rival",
            location: "Pabellón Norte, pista 2; Madrid",
        }, new Date("2026-11-01T00:00:00Z"));
        expect(ics).toContain("DTSTART:20261115T093000Z\r\n");
        expect(ics).toContain("DTEND:20261115T103000Z\r\n");
        expect(ics).toContain("DTSTAMP:20261101T000000Z\r\n");
        expect(ics).toContain("LOCATION:Pabellón Norte\\, pista 2\\; Madrid\r\n");
        expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
        expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    });
});
