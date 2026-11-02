import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Bayern D.L.Caninos",
    description: "Plantilla, calendario, resultados y estadísticas de Bayern D.L.Caninos.",
    manifest: "/site.webmanifest",
    icons: {
        icon: [
            { url: "/fotos/escudo-192.png", type: "image/png", sizes: "192x192" },
            { url: "/fotos/escudo-512.png", type: "image/png", sizes: "512x512" },
        ],
        apple: [{ url: "/fotos/escudo-192.png", type: "image/png", sizes: "192x192" }],
    },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}