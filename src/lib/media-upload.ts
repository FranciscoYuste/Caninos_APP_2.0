import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, MEDIA_KINDS, VIDEO_EXTENSIONS, type MediaKind } from "@/lib/media";

// Solo para el navegador: reduce las fotos antes de subirlas para que la web cargue rápido.
// Las fotos de jugador conservan PNG (suelen ser recortes con fondo transparente).
const IMAGE_SETTINGS: Record<Exclude<MediaKind, "video_jugador">, { maxSize: number; type: string; quality?: number }> = {
    foto_jugador: { maxSize: 900, type: "image/png" },
    foto_convocatoria: { maxSize: 1600, type: "image/jpeg", quality: 0.82 },
};

async function resizeImage(file: File, kind: Exclude<MediaKind, "video_jugador">): Promise<Blob> {
    const { maxSize, type, quality } = IMAGE_SETTINGS[kind];
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        throw new Error("No se pudo leer la imagen. Usa una foto JPG o PNG.");
    }
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no permite procesar la imagen.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) throw new Error("No se pudo preparar la imagen.");
    return blob;
}

function videoType(file: File): string {
    if (file.type) return file.type;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return Object.entries(VIDEO_EXTENSIONS).find(([, value]) => value === extension)?.[0] ?? "";
}

async function mediaRequest(body: Record<string, unknown>): Promise<{ path?: string; token?: string; url?: string | null }> {
    const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const result = await response.json() as { error?: string; path?: string; token?: string; url?: string | null };
    if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar el archivo.");
    return result;
}

// Sube directamente a Storage con una URL firmada (sin pasar el archivo por el Worker)
// y después guarda el enlace público en la base de datos. Devuelve ese enlace.
export async function uploadMedia(kind: MediaKind, id: string, file: File): Promise<string> {
    const blob = kind === "video_jugador" ? file : await resizeImage(file, kind);
    const contentType = kind === "video_jugador" ? videoType(file) : blob.type;
    if (blob.size > MEDIA_KINDS[kind].maxBytes) {
        throw new Error(`El archivo supera el máximo de ${MEDIA_KINDS[kind].maxBytes / 1024 / 1024} MB.`);
    }
    const { path, token } = await mediaRequest({ accion: "preparar", tipo: kind, id, contentType, size: blob.size });
    if (!path || !token) throw new Error("No se pudo preparar la subida.");
    const { error } = await createSupabaseBrowserClient().storage.from(MEDIA_BUCKET).uploadToSignedUrl(path, token, blob, { contentType });
    if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
    const { url } = await mediaRequest({ accion: "confirmar", tipo: kind, id, path });
    if (!url) throw new Error("No se pudo guardar el archivo.");
    return url;
}

export async function removeMedia(kind: MediaKind, id: string): Promise<void> {
    await mediaRequest({ accion: "quitar", tipo: kind, id });
}
