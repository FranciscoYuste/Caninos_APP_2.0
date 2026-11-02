"use client";

import { useEffect, useState } from "react";

function describe(remaining: number): string | null {
    if (remaining <= 0) return null;
    const minutes = Math.floor(remaining / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    if (days > 0) return `${days} D ${hours} H`;
    if (hours > 0) return `${hours} H ${minutes % 60} MIN`;
    return `${Math.max(1, minutes)} MIN`;
}

// Cuenta atrás hasta el inicio del partido. Solo se pinta en el navegador para no
// desajustar el HTML del servidor, y se actualiza cada 30 segundos.
export function Countdown({ startsAt, className = "" }: { startsAt: string; className?: string }) {
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        const tick = () => setNow(Date.now());
        const first = window.setTimeout(tick, 0);
        const interval = window.setInterval(tick, 30_000);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(interval);
        };
    }, []);

    const text = now === null ? null : describe(new Date(startsAt).getTime() - now);
    if (!text) return null;
    return <span className={className}>Faltan {text}</span>;
}
