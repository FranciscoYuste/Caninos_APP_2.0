"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Video } from "lucide-react";
import type { MediaKind } from "@/lib/media";
import { removeMedia, uploadMedia } from "@/lib/media-upload";

export type MediaPlayer = { id: string; name: string; number: number | null; photo: string | null; video: string | null };
type Status = { busy: boolean; message: string; error: boolean };

const IDLE: Status = { busy: false, message: "", error: false };

function FileButton({ label, accept, disabled, onFile, icon }: { label: string; accept: string; disabled: boolean; onFile: (file: File) => void; icon: ReactNode }) {
    return (
        <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 border border-[var(--lime)]/60 px-3 text-[10px] font-bold uppercase text-[var(--lime)] transition hover:bg-[var(--lime)] hover:text-[var(--ink)] ${disabled ? "pointer-events-none opacity-50" : ""}`}>
            {icon}{label}
            <input
                type="file"
                accept={accept}
                disabled={disabled}
                className="sr-only"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onFile(file);
                }}
            />
        </label>
    );
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] px-3 text-[10px] font-bold uppercase text-[var(--muted)] hover:border-red-300 hover:text-red-200 disabled:opacity-50">
            <Trash2 size={13} />{label}
        </button>
    );
}

// Estado de subida por destino (jugador o partido) y ejecución de la subida o el borrado.
function useMediaStatuses() {
    const router = useRouter();
    const [statuses, setStatuses] = useState<Record<string, Status>>({});

    async function run(key: string, action: () => Promise<string | null>, apply: (url: string | null) => void, done: string) {
        setStatuses((previous) => ({ ...previous, [key]: { busy: true, message: "Subiendo…", error: false } }));
        try {
            apply(await action());
            setStatuses((previous) => ({ ...previous, [key]: { busy: false, message: done, error: false } }));
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo actualizar el archivo.";
            setStatuses((previous) => ({ ...previous, [key]: { busy: false, message, error: true } }));
        }
    }

    return { status: (key: string) => statuses[key] ?? IDLE, run };
}

// Foto de convocatoria de un partido: se muestra en su tarjeta. Se reduce antes de subirla.
export function AdminMatchPhoto({ matchId, jornada, photo: initialPhoto }: { matchId: string; jornada: number; photo: string | null }) {
    const [photo, setPhoto] = useState(initialPhoto);
    const { status, run } = useMediaStatuses();
    const matchStatus = status(matchId);

    function change(file: File | null) {
        void run(
            matchId,
            async () => file ? uploadMedia("foto_convocatoria", matchId, file) : (await removeMedia("foto_convocatoria", matchId), null),
            setPhoto,
            file ? "Foto de convocatoria actualizada." : "Foto quitada.",
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden border border-[var(--line)] bg-black/30">
                {photo
                    ? <Image src={photo} alt={`Foto de convocatoria de la jornada ${jornada}`} fill unoptimized sizes="384px" className="object-cover" />
                    : <span className="absolute inset-0 grid place-items-center text-xs text-[var(--muted)]">Sin foto</span>}
            </div>
            <div className="flex flex-wrap gap-2">
                <FileButton label={photo ? "Cambiar foto" : "Subir foto"} accept="image/*" disabled={matchStatus.busy} icon={<ImagePlus size={13} />} onFile={change} />
                {photo ? <RemoveButton label="Quitar" disabled={matchStatus.busy} onClick={() => change(null)} /> : null}
            </div>
            {matchStatus.message ? <p role="status" className={`text-xs ${matchStatus.error ? "text-red-300" : "text-[var(--lime)]"}`}>{matchStatus.message}</p> : null}
        </div>
    );
}

// Fotos y vídeos de los jugadores activos.
export function AdminPlayerMedia({ players: initialPlayers }: { players: MediaPlayer[] }) {
    const [players, setPlayers] = useState(initialPlayers);
    const { status: statusOf, run } = useMediaStatuses();

    function changePlayer(kind: Extract<MediaKind, "foto_jugador" | "video_jugador">, player: MediaPlayer, file: File | null) {
        const field = kind === "foto_jugador" ? "photo" : "video";
        void run(
            player.id,
            async () => file ? uploadMedia(kind, player.id, file) : (await removeMedia(kind, player.id), null),
            (url) => setPlayers((previous) => previous.map((item) => item.id === player.id ? { ...item, [field]: url } : item)),
            file ? (kind === "foto_jugador" ? "Foto actualizada." : "Vídeo actualizado.") : "Archivo quitado.",
        );
    }

    return (
        <div>
            <p className="text-xs leading-5 text-[var(--muted)]">La foto se usa en el campo, la ficha y las cartas (mejor un recorte PNG con fondo transparente). El vídeo se reproduce en la ficha: MP4, máximo 50 MB.</p>
            <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {players.map((player) => {
                    const status = statusOf(player.id);
                    return (
                        <li key={player.id} className="py-3">
                            <div className="flex items-center gap-3">
                                <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden border border-[var(--line)] bg-black/30 text-sm font-bold">
                                    {player.photo ? <Image src={player.photo} alt="" fill unoptimized sizes="56px" className="object-contain" /> : player.name.split(" ").map((part) => part[0]).join("")}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold">{player.name} <span className="font-mono text-xs text-[var(--muted)]">#{player.number ?? "—"}</span></p>
                                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{player.photo ? "Con foto" : "Sin foto"} · {player.video ? "con vídeo" : "sin vídeo"}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <FileButton label={player.photo ? "Cambiar foto" : "Subir foto"} accept="image/*" disabled={status.busy} icon={<ImagePlus size={13} />} onFile={(file) => changePlayer("foto_jugador", player, file)} />
                                <FileButton label={player.video ? "Cambiar vídeo" : "Subir vídeo"} accept="video/mp4,video/webm,video/quicktime" disabled={status.busy} icon={<Video size={13} />} onFile={(file) => changePlayer("video_jugador", player, file)} />
                                {player.photo ? <RemoveButton label="Quitar foto" disabled={status.busy} onClick={() => changePlayer("foto_jugador", player, null)} /> : null}
                                {player.video ? <RemoveButton label="Quitar vídeo" disabled={status.busy} onClick={() => changePlayer("video_jugador", player, null)} /> : null}
                            </div>
                            {status.message ? <p role="status" className={`mt-2 text-xs ${status.error ? "text-red-300" : "text-[var(--lime)]"}`}>{status.message}</p> : null}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
