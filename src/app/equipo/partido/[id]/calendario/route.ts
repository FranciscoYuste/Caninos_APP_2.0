import { NextResponse } from "next/server";
import { FEATURED_TEAM } from "@/lib/config";
import { buildCalendarEvent } from "@/lib/ics";
import { getTeamData } from "@/lib/team-data";

// Descarga el partido como evento de calendario. Solo existe cuando la fecha y la hora están confirmadas.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const match = (await getTeamData())?.results.find((item) => item.key === id);
    if (!match?.startsAt) return NextResponse.json({ error: "Este partido aún no tiene fecha y hora confirmadas." }, { status: 404 });

    const url = new URL(`/equipo/partido/${match.key}`, request.url).toString();
    const ics = buildCalendarEvent({
        uid: `${match.key}@caninos`,
        start: new Date(match.startsAt),
        durationMinutes: 60,
        title: `⚽ J${match.jornada} · ${match.home} vs ${match.away}`,
        location: match.field,
        description: `${FEATURED_TEAM} · ${url}`,
        url,
    });
    return new Response(ics, {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="caninos-jornada-${match.jornada}.ics"`,
        },
    });
}
