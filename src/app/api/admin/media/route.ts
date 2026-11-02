import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_PHASE, ACTIVE_SEASON, isFeaturedMatch } from "@/lib/config";
import { isMediaKind, MEDIA_BUCKET, MEDIA_KINDS, mediaExtension, mediaPrefix, type MediaKind } from "@/lib/media";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MediaBody = { accion?: unknown; tipo?: unknown; id?: unknown; contentType?: unknown; size?: unknown; path?: unknown };

// Comprueba que el jugador o el partido existe y devuelve la URL guardada ahora mismo.
async function loadTarget(adminClient: SupabaseClient, kind: MediaKind, id: string) {
    const { table, column } = MEDIA_KINDS[kind];
    if (table === "jugadores") {
        const { data, error } = await adminClient.from("jugadores").select(`id,${column}`).eq("id", id).eq("activo", true).maybeSingle();
        if (error) throw new Error("No se pudo consultar el jugador.");
        if (!data) return { error: "El jugador no existe o no está activo." };
        return { currentUrl: (data as Record<string, string | null>)[column] };
    }
    const { data, error } = await adminClient
        .from("partidos").select("temporada,fase,equipo_local,equipo_visitante,foto_convocatoria_url").eq("id", id).maybeSingle();
    if (error) throw new Error("No se pudo consultar el partido.");
    if (!data || data.temporada !== ACTIVE_SEASON || data.fase !== ACTIVE_PHASE || !isFeaturedMatch(data)) {
        return { error: "Solo se pueden subir fotos de partidos del Bayern en la competición activa." };
    }
    return { currentUrl: data.foto_convocatoria_url };
}

// Borra el archivo anterior solo si lo subió la web (está dentro de su prefijo gestionado).
async function removeManagedFile(adminClient: SupabaseClient, kind: MediaKind, id: string, url: string | null | undefined) {
    if (!url) return;
    const base = adminClient.storage.from(MEDIA_BUCKET).getPublicUrl("").data.publicUrl;
    if (!url.startsWith(base)) return;
    const path = decodeURIComponent(url.slice(base.length));
    if (!path.startsWith(mediaPrefix(kind, id))) return;
    const { error } = await adminClient.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) console.error("Could not remove replaced media file", { path, error });
}

async function saveUrl(adminClient: SupabaseClient, kind: MediaKind, id: string, url: string | null) {
    const { table, column } = MEDIA_KINDS[kind];
    const { error } = await adminClient.from(table).update({ [column]: url }).eq("id", id);
    if (error) throw new Error("No se pudo guardar el enlace del archivo.");
}

export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as MediaBody;
        const id = typeof body.id === "string" ? body.id : "";
        if (!isMediaKind(body.tipo)) return NextResponse.json({ error: "Tipo de archivo no válido." }, { status: 400 });
        if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "El destino indicado no es válido." }, { status: 400 });
        const kind = body.tipo;
        const target = await loadTarget(adminClient, kind, id);
        if ("error" in target) return NextResponse.json({ error: target.error }, { status: 404 });

        if (body.accion === "preparar") {
            const contentType = typeof body.contentType === "string" ? body.contentType : "";
            const extension = mediaExtension(kind, contentType);
            if (!extension) return NextResponse.json({ error: "Formato de archivo no admitido." }, { status: 400 });
            if (typeof body.size !== "number" || body.size <= 0 || body.size > MEDIA_KINDS[kind].maxBytes) {
                return NextResponse.json({ error: `El archivo supera el máximo de ${MEDIA_KINDS[kind].maxBytes / 1024 / 1024} MB.` }, { status: 413 });
            }
            const path = `${mediaPrefix(kind, id)}${Date.now()}.${extension}`;
            const { data, error } = await adminClient.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
            if (error || !data) {
                console.error("Could not create signed upload URL", error);
                return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });
            }
            return NextResponse.json({ ok: true, path: data.path, token: data.token });
        }

        if (body.accion === "confirmar") {
            const path = typeof body.path === "string" ? body.path : "";
            const prefix = mediaPrefix(kind, id);
            if (!path.startsWith(prefix) || path.includes("..") || path.slice(prefix.length).includes("/")) {
                return NextResponse.json({ error: "La ruta del archivo no es válida." }, { status: 400 });
            }
            const folder = path.slice(0, path.lastIndexOf("/"));
            const name = path.slice(path.lastIndexOf("/") + 1);
            const { data: listed, error: listError } = await adminClient.storage.from(MEDIA_BUCKET).list(folder, { search: name });
            if (listError || !listed?.some((file) => file.name === name)) {
                return NextResponse.json({ error: "No se encontró el archivo subido." }, { status: 404 });
            }
            const url = adminClient.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
            await saveUrl(adminClient, kind, id, url);
            await removeManagedFile(adminClient, kind, id, target.currentUrl);
            return NextResponse.json({ ok: true, url });
        }

        if (body.accion === "quitar") {
            await saveUrl(adminClient, kind, id, null);
            await removeManagedFile(adminClient, kind, id, target.currentUrl);
            return NextResponse.json({ ok: true, url: null });
        }

        return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    } catch (error) {
        console.error("Media update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el archivo.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
