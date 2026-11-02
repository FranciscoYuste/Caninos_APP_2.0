// Archivos que el admin puede subir a Supabase Storage. Lo comparten el navegador y el servidor.
export const MEDIA_BUCKET = "caninos-media";

export const MEDIA_KINDS = {
    foto_jugador: { table: "jugadores", column: "foto_url", maxBytes: 5 * 1024 * 1024 },
    video_jugador: { table: "jugadores", column: "video_url", maxBytes: 50 * 1024 * 1024 },
    foto_convocatoria: { table: "partidos", column: "foto_convocatoria_url", maxBytes: 5 * 1024 * 1024 },
} as const;

export type MediaKind = keyof typeof MEDIA_KINDS;

export const VIDEO_EXTENSIONS: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
};

export function isMediaKind(value: unknown): value is MediaKind {
    return typeof value === "string" && Object.hasOwn(MEDIA_KINDS, value);
}

// Prefijo de las rutas que gestiona la web para un jugador o partido. Solo estos archivos
// se borran al sustituirlos: lo subido a mano en la raíz del bucket no se toca nunca.
export function mediaPrefix(kind: MediaKind, id: string): string {
    if (kind === "foto_jugador") return `jugadores/${id}/foto-`;
    if (kind === "video_jugador") return `jugadores/${id}/video-`;
    return `convocatorias/${id}-`;
}

export function mediaExtension(kind: MediaKind, contentType: string): string | null {
    if (kind === "foto_jugador") return contentType === "image/png" ? "png" : null;
    if (kind === "foto_convocatoria") return contentType === "image/jpeg" ? "jpg" : null;
    return VIDEO_EXTENSIONS[contentType] ?? null;
}
