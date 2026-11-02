import type { Metadata } from "next";
import { FEATURED_TEAM } from "@/lib/config";

// openGraph se sustituye entero en cada página, así que se repiten aquí los campos comunes.
// Por defecto usa la imagen general (src/app/opengraph-image.tsx); las páginas de detalle pasan la suya.
export function pageMetadata(title: string, description: string, image = "/opengraph-image"): Metadata {
    const images = [image];
    return {
        title,
        description,
        openGraph: { title, description, siteName: FEATURED_TEAM, locale: "es_ES", type: "website", images },
        twitter: { card: "summary_large_image", title, description, images },
    };
}
