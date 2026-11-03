"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { frameMedia, measureSubject, readSubject, saveSubject, type FrameTarget, type Subject } from "@/lib/media-framing";

// Coloca el medio dentro de su contenedor según la silueta medida.
function frameStyle(subject: Subject, media: { width: number; height: number }, container: HTMLElement | null, target: FrameTarget): CSSProperties | undefined {
    if (!container) return undefined;
    const box = frameMedia(subject, media, { width: container.clientWidth, height: container.clientHeight }, target);
    if (!box) return undefined;
    return {
        position: "absolute",
        left: `${box.left * 100}%`,
        top: `${box.top * 100}%`,
        width: `${box.width * 100}%`,
        height: `${box.height * 100}%`,
        right: "auto",
        bottom: "auto",
        maxWidth: "none",
    };
}

const videoSize = (video: HTMLVideoElement) => ({ width: video.videoWidth, height: video.videoHeight });

// Foto recortada (fondo transparente) encuadrada como las demás. El encuadre se aplica a un
// envoltorio porque next/image con fill no deja cambiar su tamaño. Sin medida, queda abajo y entera.
export function FramedPhoto({ src, alt, frame, sizes }: { src: string; alt: string; frame: FrameTarget; sizes: string }) {
    const [style, setStyle] = useState<CSSProperties>();
    const [loaded, setLoaded] = useState(false);

    return (
        <span className={`framed-media absolute inset-0${loaded ? "" : " is-pending"}`} style={style}>
            <Image
                src={src}
                alt={alt}
                fill
                unoptimized
                sizes={sizes}
                crossOrigin="anonymous"
                draggable={false}
                className="object-contain object-bottom"
                onLoad={(event) => {
                    const image = event.currentTarget;
                    const media = { width: image.naturalWidth, height: image.naturalHeight };
                    const subject = readSubject(src) ?? measureSubject(image, media.width, media.height);
                    if (subject) {
                        saveSubject(src, subject);
                        setStyle(frameStyle(subject, media, image.parentElement?.parentElement ?? null, frame));
                    }
                    setLoaded(true);
                }}
                onError={() => setLoaded(true)}
            />
        </span>
    );
}

// Vídeo de la ficha: se reproduce una vez, sin sonido, y se queda en el último fotograma.
// Antes de empezar salta a ese último fotograma para medirlo y encuadrarlo. Si el navegador no
// lo deja leer hasta reproducirlo (iOS), se mide al terminar y se recoloca con una transición.
export function FramedVideo({ src, label, frame }: { src: string; label: string; frame: FrameTarget }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [style, setStyle] = useState<CSSProperties>();
    const [phase, setPhase] = useState<"pending" | "playing" | "reframing">("pending");

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        let measuring = false;
        let started = false;

        const start = () => {
            if (started) return;
            started = true;
            if (measuring) video.currentTime = 0;
            measuring = false;
            setPhase("playing");
            void video.play().catch((error: unknown) => {
                console.error(`No se pudo reproducir el ${label}.`, error);
            });
        };
        const onMetadata = () => {
            if (started || measuring) return;
            const cached = readSubject(src);
            if (cached) {
                setStyle(frameStyle(cached, videoSize(video), video.parentElement, frame));
                start();
                return;
            }
            measuring = true;
            video.currentTime = Math.max(0, video.duration - 0.05);
        };
        const onSeeked = () => {
            if (!measuring) return;
            const subject = measureSubject(video, video.videoWidth, video.videoHeight);
            if (subject) {
                saveSubject(src, subject);
                setStyle(frameStyle(subject, videoSize(video), video.parentElement, frame));
            }
            start();
        };

        // Si medir tarda, se reproduce igualmente
        const fallback = window.setTimeout(start, 2500);
        video.addEventListener("loadedmetadata", onMetadata);
        video.addEventListener("seeked", onSeeked);
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();
        return () => {
            window.clearTimeout(fallback);
            video.removeEventListener("loadedmetadata", onMetadata);
            video.removeEventListener("seeked", onSeeked);
        };
    }, [src, label, frame]);

    return (
        <video
            ref={videoRef}
            className={`framed-media h-full w-full object-cover object-top${phase === "pending" ? " is-pending" : phase === "reframing" ? " is-reframing" : ""}`}
            style={style}
            src={src}
            crossOrigin="anonymous"
            muted
            playsInline
            preload="auto"
            aria-label={label}
            onEnded={(event) => {
                const video = event.currentTarget;
                video.pause();
                if (!style) {
                    const subject = measureSubject(video, video.videoWidth, video.videoHeight);
                    if (subject) {
                        saveSubject(src, subject);
                        setPhase("reframing");
                        setStyle(frameStyle(subject, videoSize(video), video.parentElement, frame));
                    }
                }
                if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.05);
            }}
            onError={(event) => console.error(`Error al cargar el ${label}.`, event.currentTarget.error)}
        />
    );
}
