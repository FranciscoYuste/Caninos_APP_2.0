"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleAlert, RotateCcw } from "lucide-react";

export function IntroLanding() {
    const [isMobile, setIsMobile] = useState(false);
    const [videoUnavailable, setVideoUnavailable] = useState(false);
    const [replayKey, setReplayKey] = useState(0);
    const [showEnter, setShowEnter] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 767px)");
        const updateViewport = () => {
            setIsMobile(mediaQuery.matches);
            setShowEnter(false);
        };

        updateViewport();
        mediaQuery.addEventListener("change", updateViewport);
        return () => mediaQuery.removeEventListener("change", updateViewport);
    }, []);

    useEffect(() => {
        if (!isMobile) return;

        const timer = window.setTimeout(() => setShowEnter(true), 1500);
        return () => window.clearTimeout(timer);
    }, [isMobile]);

    return (
        <>
            <main className="intro-desktop" aria-label="Portada Bayern D.L.Caninos">
                <div className="intro-desktop-content">
                    <p className="intro-desktop-kicker">Bayern D.L.Caninos · Temporada 2026–2027</p>
                    <h1>Un equipo.<br /><span>Dos rodillas sanas.</span></h1>
                    <p className="intro-desktop-description">Sigue al equipo, consulta la clasificación, los partidos y las estadísticas de la temporada.</p>
                    <div className="intro-desktop-actions">
                        <Link href="/equipo" className="intro-desktop-enter">Ver equipo</Link>
                        <Link href="/login?next=%2Fadmin" className="intro-desktop-admin">Administración</Link>
                    </div>
                </div>
            </main>
            <main className="intro-viewport" aria-label="Portada Bayern D.L.Caninos">
                <div className={`intro-frame ${videoUnavailable ? "intro-frame--fallback" : ""}`}>
                    {isMobile && !videoUnavailable ? (
                        <video
                            key={replayKey}
                            className="intro-video"
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onError={() => setVideoUnavailable(true)}
                            aria-label="Video de bienvenida de Bayern D.L.Caninos"
                        >
                            <source src="/videos/introEdit.MP4" type="video/mp4" />
                        </video>
                    ) : videoUnavailable ? (
                        <div className="intro-fallback">
                            <CircleAlert size={22} />
                            <p>No se pudo reproducir el video.</p>
                            <button onClick={() => { setVideoUnavailable(false); setReplayKey((key) => key + 1); }}>
                                <RotateCcw size={15} /> Reintentar
                            </button>
                        </div>
                    ) : null}

                    <Link
                        href="/equipo"
                        className={`intro-hotspot ${showEnter ? "is-visible" : ""}`}
                        aria-label="Entrar al equipo"
                        aria-hidden={!showEnter}
                        tabIndex={showEnter ? 0 : -1}
                    >
                        <span className="intro-hotspot-label">Entrar</span>
                        <span className="intro-hotspot-hint">Bayern D.L. Caninos</span>
                        <ArrowUpRight className="intro-hotspot-icon" size={22} strokeWidth={2.5} aria-hidden="true" />
                    </Link>
                </div>
            </main>
        </>
    );
}