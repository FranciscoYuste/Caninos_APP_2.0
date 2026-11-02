"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Activity, Ambulance, ArrowUpRight, CalendarDays, ClipboardList, Shield, Star, Trophy, Users } from "lucide-react";
import { ACTIVE_SEASON, FEATURED_TEAM } from "@/lib/config";

type CompetitionId = "winter" | "promotion" | "cup";

const menuItems = [
    { id: "competition" as const, href: "/equipo", label: "Clasificación y partidos", icon: Trophy },
    { id: "players" as const, href: "/equipo/jugadores", label: "Jugadores", icon: Users },
    { id: "callups" as const, href: "/equipo/convocatorias", label: "Convocatorias", icon: ClipboardList },
    { id: "stats" as const, href: "/equipo/estadisticas", label: "Estadísticas", icon: Activity },
    { id: "katsu" as const, href: "/equipo/katsu", label: "Jugador KATSU", icon: Star },
    { id: "injuries" as const, href: "/equipo/lesionados", label: "Lesionados", icon: Ambulance },
];

const competitions: Array<{ id: CompetitionId; label: string; status: string }> = [
    { id: "winter", label: "Liga de invierno", status: "En curso" },
    { id: "promotion", label: "Liga de ascenso / descenso", status: "Pendiente" },
    { id: "cup", label: "Copa", status: "Pendiente" },
];

// Pestaña activa según la ruta: las páginas de detalle cuelgan de su sección.
function getActiveMenu(pathname: string) {
    if (pathname.startsWith("/equipo/jugador")) return "players";
    if (pathname.startsWith("/equipo/convocatorias")) return "callups";
    if (pathname.startsWith("/equipo/estadisticas")) return "stats";
    if (pathname.startsWith("/equipo/katsu")) return "katsu";
    if (pathname.startsWith("/equipo/lesionados")) return "injuries";
    return "competition";
}

export function TeamShell({ teamPosition, nextMatchDate, children }: { teamPosition?: number; nextMatchDate?: string; children: ReactNode }) {
    const pathname = usePathname();
    const activeMenu = getActiveMenu(pathname);
    const [activeCompetition, setActiveCompetition] = useState<CompetitionId>("winter");
    const selectedCompetition = competitions.find(({ id }) => id === activeCompetition) ?? competitions[0];

    return (
        <main className="min-h-screen">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3 sm:px-10">
                <a href="#inicio" className="flex items-center gap-3" aria-label="Bayern D.L.Caninos, inicio"><Image src="/fotos/escudo-256.png" alt="" width={44} height={44} priority className="size-11 object-contain" /><span className="text-sm font-bold tracking-[0.08em]">Bayern D.L.Caninos</span></a>
                <a href="/login?next=%2Fadmin" className="flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--lime)]">Administración</a>
            </header>

            <section id="inicio" className="team-hero-background relative isolate min-h-[300px] overflow-hidden border-b border-[var(--line)] sm:min-h-[360px]">
                <div className="pitch-lines pointer-events-none absolute inset-0 z-0 opacity-30" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#111311]/90 via-[#111311]/65 to-[#111311]/35" />
                <div className="relative z-20 mx-auto flex min-h-[300px] max-w-7xl items-center gap-2 px-4 py-6 sm:min-h-[360px] sm:gap-8 sm:px-10 sm:py-10">
                    <div className="min-w-0 flex-1 text-left">
                        <p className="mb-3 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--lime)] sm:mb-4 sm:gap-2 sm:text-xs sm:tracking-[0.2em]"><span className="size-2 shrink-0 rounded-full bg-[var(--lime)]" /> Temporada {ACTIVE_SEASON} · {selectedCompetition.label}</p>
                        <h1 className="text-[clamp(1.5rem,7vw,2.75rem)] font-black uppercase leading-[0.94] sm:text-7xl">Un equipo.<br /><span className="text-[var(--lime)]">Dos rodillas</span> sanas.</h1>
                        <div className="mt-5 flex flex-col items-start gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                            <Link href="/equipo" scroll={false} onClick={() => { setActiveCompetition("winter"); document.getElementById("contenido")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--lime)] px-2.5 py-3 text-[9px] font-black uppercase text-[var(--ink)] sm:gap-2 sm:px-4 sm:text-xs">Ver competición <ArrowUpRight size={14} className="sm:size-4" /></Link>
                            <span className="max-w-full font-mono text-[9px] leading-relaxed text-white/70 sm:text-xs">{activeCompetition === "winter" ? `PRÓXIMA FECHA · ${nextMatchDate ?? "POR ANUNCIAR"}` : "COMPETICIÓN PENDIENTE DE INICIO"}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-6">
                        <Image src="/fotos/escudo-256.png" alt="Escudo de Bayern D.L. Caninos" width={104} height={104} priority className="size-14 object-contain drop-shadow-lg sm:size-24" />
                        <div className="text-center sm:border-l sm:border-white/25 sm:pl-6 sm:text-right">
                            <p className="font-mono text-2xl font-bold sm:text-5xl">{activeCompetition === "winter" && teamPosition ? <>{teamPosition}<sup className="ml-0.5 text-[0.48em] text-[var(--lime)]">º</sup></> : "—"}</p>
                            <p className="mt-1 max-w-20 text-[7px] uppercase leading-tight tracking-[0.06em] text-white/65 sm:max-w-none sm:text-[10px] sm:tracking-[0.15em]">{activeCompetition === "winter" ? "en la tabla" : "clasificación pendiente"}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div id="contenido" className="mx-auto max-w-7xl px-5 sm:px-10">
                <div className="-mx-5 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:hidden">
                    <label htmlFor="competition-select" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Competición</label>
                    <select id="competition-select" value={activeCompetition} onChange={(event) => {
                        const selected = competitions.find(({ id }) => id === event.target.value);
                        if (selected) setActiveCompetition(selected.id);
                    }} className="w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-center text-xs font-bold uppercase text-[var(--paper)] focus:border-[var(--lime)] focus:outline-none">
                        {competitions.map(({ id, label, status }) => <option key={id} value={id}>{label} · {status}</option>)}
                    </select>
                </div>
                <nav aria-label="Competiciones" className="hidden justify-center gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:px-10">
                    {competitions.map(({ id, label, status }) => (
                        <button key={id} type="button" aria-current={activeCompetition === id ? "page" : undefined} onClick={() => setActiveCompetition(id)} className={`flex shrink-0 flex-col items-center gap-1 border px-4 py-3 text-center transition-colors ${activeCompetition === id ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span>
                            <span className={`text-[9px] uppercase tracking-[0.1em] ${activeCompetition === id ? "opacity-70" : ""}`}>{status}</span>
                        </button>
                    ))}
                </nav>

                {activeCompetition === "winter" ? (
                    <>
                <nav aria-label="Secciones del equipo" className="sticky top-0 z-10 -mx-5 grid grid-cols-2 gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:flex-wrap sm:justify-center sm:px-10">
                    {menuItems.map(({ id, href, label, icon: Icon }) => (
                        <Link key={id} href={href} scroll={false} aria-current={activeMenu === id ? "page" : undefined} className={`flex min-w-0 items-center justify-center gap-1.5 border px-2 py-3 text-[9px] font-bold uppercase leading-tight tracking-[0.04em] transition-colors sm:shrink-0 sm:gap-2 sm:px-4 sm:text-[10px] sm:tracking-[0.08em] ${activeMenu === id ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                            <Icon size={15} className="shrink-0" />{label}
                        </Link>
                    ))}
                </nav>

                {children}
                    </>
                ) : (
                <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {ACTIVE_SEASON} · Próximamente</p>
                    <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">{activeCompetition === "promotion" ? "Liga de ascenso / descenso" : "Copa"}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                        {activeCompetition === "promotion"
                            ? "Esta competición se activará cuando termine la Liga de invierno y se confirme en qué grupo jugará Bayern D.L.Caninos. Aquí tendrá sus propios partidos, clasificación, convocatorias y estadísticas."
                            : "La sección se activará cuando se confirmen el formato y el calendario de la Copa. Sus partidos, convocatorias y estadísticas se mantendrán separados de los de liga."}
                    </p>
                    <span className="mt-7 inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><CalendarDays size={14} /> Pendiente de inicio</span>
                </section>
                )}
            </div>
            <footer className="flex flex-nowrap items-center justify-between gap-1.5 border-t border-[var(--line)] px-2 py-5 text-[7px] uppercase tracking-[0.01em] text-[var(--muted)] sm:gap-3 sm:px-10 sm:py-6 sm:text-[10px] sm:tracking-[0.12em]"><span className="whitespace-nowrap">Bayern D.L.Caninos. Creado para fumar en equipo.</span><span className="flex shrink-0 items-center gap-1 whitespace-nowrap sm:gap-3"><Image src="/fotos/corona-96.png" alt="" aria-hidden="true" width={42} height={42} className="footer-emblem-glow size-6 object-contain sm:size-9" /><span className="flex items-center gap-1 sm:gap-2"><Shield size={12} className="hidden sm:block" /><span className="hidden sm:inline">Temporada </span>{ACTIVE_SEASON}</span></span></footer>
        </main>
    );
}
