import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { headers } from "next/headers";
import { FEATURED_TEAM } from "@/lib/config";
import "./globals.css";

// Letra estrecha de las cartas de jugador y KATSU.
const cardFont = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "800", "900"], style: ["normal", "italic"], variable: "--font-card", display: "swap" });

const description = `Plantilla, calendario, resultados y estadísticas de ${FEATURED_TEAM}.`;

// Las vistas previas (WhatsApp, etc.) necesitan URLs absolutas; se toman del dominio de la petición.
export async function generateMetadata(): Promise<Metadata> {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

    return {
        metadataBase: new URL(`${protocol}://${host}`),
        title: { default: FEATURED_TEAM, template: `%s · ${FEATURED_TEAM}` },
        description,
        manifest: "/site.webmanifest",
        icons: {
            icon: [
                { url: "/fotos/escudo-192.png", type: "image/png", sizes: "192x192" },
                { url: "/fotos/escudo-512.png", type: "image/png", sizes: "512x512" },
            ],
            apple: [{ url: "/fotos/escudo-192.png", type: "image/png", sizes: "192x192" }],
        },
        openGraph: { title: FEATURED_TEAM, description, siteName: FEATURED_TEAM, locale: "es_ES", type: "website" },
        twitter: { card: "summary_large_image", title: FEATURED_TEAM, description },
    };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es" className={cardFont.variable}>
            <body>{children}</body>
        </html>
    );
}
