"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";

export function IntroLanding() {
    const [videoUnavailable, setVideoUnavailable] = useState(false);
    const [replayKey, setReplayKey] = useState(0);

    return (
        <main className="intro-viewport" aria-label="Portada Bayern D.L.Caninos">
            <div className={`intro-frame ${videoUnavailable ? "intro-frame--fallback" : ""}`}>
                {!videoUnavailable ? (
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
                ) : (
                    <div className="intro-fallback">
                        <CircleAlert size={22} />
                        <p>No se pudo reproducir el video.</p>
                        <button onClick={() => { setVideoUnavailable(false); setReplayKey((key) => key + 1); }}>
                            <RotateCcw size={15} /> Reintentar
                        </button>
                    </div>
                )}

                <Link href="/equipo" className="intro-hotspot intro-hotspot--enter" aria-label="Entrar al equipo">
                    <span>Entrar</span>
                </Link>
                <Link href="/login?next=%2Fadmin" className="intro-hotspot intro-hotspot--admin" aria-label="Acceso de administración">
                    <span>Admin</span>
                </Link>
            </div>
        </main>
    );
}