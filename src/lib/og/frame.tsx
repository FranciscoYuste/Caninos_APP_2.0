import type { ReactNode } from "react";
import { FEATURED_TEAM } from "@/lib/config";
import { ESCUDO_DATA_URL } from "@/lib/og/escudo";

// Piezas comunes de las imágenes de vista previa (next/og solo admite estilos en línea y flexbox).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_COLORS = { ink: "#111311", panel: "#1a1d1a", line: "#343934", lime: "#f2cf18", paper: "#f3f3ec", muted: "#a4aaa0" };

export function OgFrame({ kicker, season, children }: { kicker: string; season?: string; children: ReactNode }) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: 56,
                color: OG_COLORS.paper,
                backgroundColor: OG_COLORS.ink,
                backgroundImage: `linear-gradient(135deg, ${OG_COLORS.ink} 0%, #1c2119 55%, #3b3a17 100%)`,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ESCUDO_DATA_URL} width={88} height={88} alt="" />
                    <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
                        <span style={{ fontSize: 34, fontWeight: 700 }}>{FEATURED_TEAM}</span>
                        <span style={{ fontSize: 24, color: OG_COLORS.lime, letterSpacing: 4, textTransform: "uppercase" }}>{kicker}</span>
                    </div>
                </div>
                {season ? <span style={{ fontSize: 22, color: OG_COLORS.muted, letterSpacing: 3 }}>TEMPORADA {season}</span> : null}
            </div>
            <div style={{ display: "flex", flex: 1, marginTop: 32 }}>{children}</div>
        </div>
    );
}

// Las imágenes muy pesadas superan el límite interno del renderizador de next/og.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// Descarga una imagen remota y la incrusta; si falla o es demasiado grande, la vista previa se genera sin ella.
export async function imageAsDataUrl(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    try {
        const response = await fetch(url);
        const type = response.headers.get("content-type") ?? "";
        if (!response.ok || !/^image\/(png|jpe?g|gif)/.test(type)) return null;
        if (Number(response.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return null;
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
        return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
    } catch {
        return null;
    }
}
