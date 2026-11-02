// Evento de calendario (.ics) para un partido. Lo abren Calendario de iPhone, Google Calendar, Outlook…
type CalendarEvent = { uid: string; start: Date; durationMinutes: number; title: string; location?: string | null; description?: string; url?: string };

function icsDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (match) => `\\${match}`);
}

export function buildCalendarEvent(event: CalendarEvent, now = new Date()): string {
    const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Bayern D.L.Caninos//Partidos//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${event.uid}`,
        `DTSTAMP:${icsDate(now)}`,
        `DTSTART:${icsDate(event.start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsText(event.title)}`,
        event.location ? `LOCATION:${icsText(event.location)}` : null,
        event.description ? `DESCRIPTION:${icsText(event.description)}` : null,
        event.url ? `URL:${event.url}` : null,
        "END:VEVENT",
        "END:VCALENDAR",
    ];
    return `${lines.filter((line) => line !== null).join("\r\n")}\r\n`;
}
