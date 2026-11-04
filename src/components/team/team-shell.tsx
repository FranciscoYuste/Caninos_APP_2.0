"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Ambulance, ArrowUpRight, CalendarDays, CalendarPlus, ClipboardList, Gamepad2, Shield, Star, Trophy, Users } from "lucide-react";
import { Countdown } from "@/components/team/countdown";
import { FormBadges } from "@/components/team/form-badges";
import { competitionPath, isTeamSection, type TeamSection } from "@/lib/competition-paths";
import type { FormResult } from "@/lib/team-form";

export type ShellCompetition = { season: string; slug: string; name: string; status: "pendiente" | "en_curso" | "finalizada" };
export type NextMatchSummary = { id: string; date: string; startsAt: string | null };
type MenuId = "competition" | TeamSection;

const menuItems: Array<{ id: MenuId; label: string; icon: typeof Trophy }> = [
    { id: "competition", label: "Clasificación y partidos", icon: Trophy },
    { id: "jugadores", label: "Jugadores", icon: Users },
    { id: "convocatorias", label: "Convocatorias", icon: ClipboardList },
    { id: "estadisticas", label: "Estadísticas", icon: Activity },
    { id: "katsu", label: "Jugador KATSU", icon: Star },
    { id: "fantasy", label: "Fantasy", icon: Gamepad2 },
    { id: "lesionados", label: "Lesionados", icon: Ambulance },
];

const STATUS_LABELS: Record<ShellCompetition["status"], string> = { pendiente: "Pendiente", en_curso: "En curso", finalizada: "Finalizada" };

function sectionHref(competition: ShellCompetition, id: MenuId) {
    return competitionPath(competition, id === "competition" ? undefined : id);
}

export function TeamShell({ competition, competitions, seasons, teamPosition, nextMatch, teamForm, activeSection, children }: {
    competition: ShellCompetition;
    competitions: ShellCompetition[];
    seasons: Array<{ season: string; href: string }>;
    teamPosition?: number;
    nextMatch?: NextMatchSummary;
    teamForm: FormResult[];
    activeSection?: MenuId;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    // Pestaña activa: la indicada por la página de detalle o la que marca la ruta de la competición.
    const routeSection = pathname.split("/")[3] ?? "";
    const activeMenu: MenuId = activeSection ?? (isTeamSection(routeSection) ? routeSection : "competition");
    const pending = competition.status === "pendiente";
    const isCurrent = (item: ShellCompetition) => item.season === competition.season && item.slug === competition.slug;

    return (
        <main className="min-h-screen">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3 sm:px-10">
                <a href="#inicio" className="flex items-center gap-3" aria-label="Bayern D.L.Caninos, inicio"><Image src="/fotos/escudo-256.png" alt="" width={44} height={44} priority className="size-11 object-contain" /><span className="text-sm font-bold tracking-[0.08em]">Bayern D.L.Caninos</span></a>
                <Link href="/login?next=%2Fadmin" className="flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--lime)]">Administración</Link>
            </header>

            <section id="inicio" className="team-hero-background relative isolate min-h-[300px] overflow-hidden border-b border-[var(--line)] sm:min-h-[360px]">
                <div className="pitch-lines pointer-events-none absolute inset-0 z-0 opacity-30" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#111311]/90 via-[#111311]/65 to-[#111311]/35" />
                <div className="relative z-20 mx-auto flex min-h-[300px] max-w-7xl items-center gap-2 px-4 py-6 sm:min-h-[360px] sm:gap-8 sm:px-10 sm:py-10">
                    <div className="min-w-0 flex-1 text-left">
                        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--lime)] sm:mb-4 sm:gap-2 sm:text-xs sm:tracking-[0.2em]"><span className="size-2 shrink-0 rounded-full bg-[var(--lime)]" /> Temporada {competition.season} · {competition.name}</p>
                        <h1 className="text-[clamp(1.5rem,7vw,2.75rem)] font-black uppercase leading-[0.94] sm:text-7xl">Un equipo.<br /><span className="text-[var(--lime)]">Dos rodillas</span> sanas.</h1>
                        <div className="mt-5 flex flex-col items-start gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                            <Link href={competitionPath(competition)} scroll={false} onClick={() => document.getElementById("contenido")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--lime)] px-2.5 py-3 text-[10px] font-black uppercase text-[var(--ink)] sm:gap-2 sm:px-4 sm:text-xs">Ver competición <ArrowUpRight size={14} className="sm:size-4" /></Link>
                            <span className="max-w-full font-mono text-[10px] leading-relaxed text-white/70 sm:text-xs">
                                {pending ? "COMPETICIÓN PENDIENTE DE INICIO" : competition.status === "finalizada" ? "COMPETICIÓN FINALIZADA" : `PRÓXIMA FECHA · ${nextMatch?.date ?? "POR ANUNCIAR"}`}
                            </span>
                            {competition.status === "en_curso" && nextMatch?.startsAt ? (
                                <span className="flex flex-wrap items-center gap-3">
                                    <Countdown startsAt={nextMatch.startsAt} className="font-mono text-[10px] font-bold uppercase text-[var(--lime)] sm:text-xs" />
                                    <a href={`/partido/${nextMatch.id}/calendario`} className="inline-flex min-h-9 items-center gap-1.5 border border-white/30 bg-black/30 px-2.5 text-[10px] font-bold uppercase hover:border-[var(--lime)] hover:text-[var(--lime)]"><CalendarPlus size={13} /> Añadir al calendario</a>
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-6">
                        <Image src="/fotos/escudo-256.png" alt="Escudo de Bayern D.L. Caninos" width={104} height={104} priority data-intro-crest className="size-14 object-contain drop-shadow-lg sm:size-24" />
                        <div className="text-center sm:border-l sm:border-white/25 sm:pl-6 sm:text-right">
                            <p className="font-mono text-2xl font-bold sm:text-5xl">{!pending && teamPosition ? <>{teamPosition}<sup className="ml-0.5 text-[0.48em] text-[var(--lime)]">º</sup></> : "—"}</p>
                            <p className="mt-1 max-w-20 text-[10px] uppercase leading-tight tracking-[0.06em] text-white/65 sm:max-w-none sm:tracking-[0.15em]">{pending ? "clasificación pendiente" : "en la tabla"}</p>
                            {!pending ? <FormBadges form={teamForm} className="mt-2" /> : null}
                        </div>
                    </div>
                </div>
            </section>

            <div id="contenido" className="mx-auto max-w-7xl px-5 sm:px-10">
                <div className="-mx-5 grid gap-3 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:hidden">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Competición
                        <select
                            value={competitionPath(competition)}
                            onChange={(event) => router.push(event.target.value, { scroll: false })}
                            className="mt-2 w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-center text-xs font-bold uppercase text-[var(--paper)] focus:border-[var(--lime)] focus:outline-none"
                        >
                            {competitions.map((item) => <option key={item.slug} value={competitionPath(item)}>{item.name} · {STATUS_LABELS[item.status]}</option>)}
                        </select>
                    </label>
                    {seasons.length > 1 ? (
                        <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                            Temporada
                            <select value={seasons.find((item) => item.season === competition.season)?.href} onChange={(event) => router.push(event.target.value)} className="mt-2 w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-center text-xs font-bold text-[var(--paper)] focus:border-[var(--lime)] focus:outline-none">
                                {seasons.map((item) => <option key={item.season} value={item.href}>{item.season}</option>)}
                            </select>
                        </label>
                    ) : null}
                </div>
                <nav aria-label="Competiciones" className="hidden items-center justify-center gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:px-10">
                    {competitions.map((item) => (
                        <Link key={item.slug} href={competitionPath(item)} scroll={false} aria-current={isCurrent(item) ? "page" : undefined} className={`flex shrink-0 flex-col items-center gap-1 border px-4 py-3 text-center transition-colors ${isCurrent(item) ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{item.name}</span>
                            <span className={`text-[10px] uppercase tracking-[0.1em] ${isCurrent(item) ? "opacity-70" : ""}`}>{STATUS_LABELS[item.status]}</span>
                        </Link>
                    ))}
                    {seasons.length > 1 ? (
                        <select aria-label="Temporada" value={seasons.find((item) => item.season === competition.season)?.href} onChange={(event) => router.push(event.target.value)} className="ml-2 self-stretch border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-bold text-[var(--paper)] focus:border-[var(--lime)] focus:outline-none">
                            {seasons.map((item) => <option key={item.season} value={item.href}>{item.season}</option>)}
                        </select>
                    ) : null}
                </nav>

                {!pending ? (
                    <>
                        <nav aria-label="Secciones del equipo" className="sticky top-0 z-10 -mx-5 grid grid-cols-2 gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:flex-wrap sm:justify-center sm:px-10">
                            {menuItems.map(({ id, label, icon: Icon }) => (
                                <Link key={id} href={sectionHref(competition, id)} scroll={false} aria-current={activeMenu === id ? "page" : undefined} className={`flex min-w-0 items-center justify-center gap-1.5 border px-2 py-3 odd:last:col-span-2 text-[10px] font-bold uppercase leading-tight tracking-[0.04em] transition-colors sm:shrink-0 sm:gap-2 sm:px-4 sm:tracking-[0.08em] ${activeMenu === id ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                                    <Icon size={15} className="shrink-0" />{label}
                                </Link>
                            ))}
                        </nav>
                        {children}
                    </>
                ) : (
                    <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {competition.season} · Próximamente</p>
                        <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">{competition.name}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">Esta competición se activará cuando se confirmen el formato y el calendario. Aquí tendrá sus propios partidos, clasificación, convocatorias y estadísticas, separados del resto de competiciones.</p>
                        <span className="mt-7 inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><CalendarDays size={14} /> Pendiente de inicio</span>
                    </section>
                )}
            </div>
            <footer className="flex flex-nowrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-5 text-[10px] uppercase leading-snug tracking-[0.01em] text-[var(--muted)] sm:px-10 sm:py-6 sm:tracking-[0.12em]"><span className="min-w-0">Bayern D.L.Caninos. Creado para fumar en equipo.</span><span className="flex shrink-0 items-center gap-1 whitespace-nowrap sm:gap-3"><Image src="/fotos/corona-96.png" alt="" aria-hidden="true" width={42} height={42} className="footer-emblem-glow size-6 object-contain sm:size-9" /><span className="flex items-center gap-1 sm:gap-2"><Shield size={12} />Temporada {competition.season}</span></span></footer>
        </main>
    );
}
