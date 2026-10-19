import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Bayern D.L.Caninos",
    description: "Plantilla, calendario, resultados y estadísticas de Bayern D.L.Caninos.",
    manifest: "/site.webmanifest",
    icons: {
        icon: [{ url: "/fotos/escudo.png", type: "image/png", sizes: "1280x1280" }],
        apple: [{ url: "/fotos/escudo.png", type: "image/png", sizes: "1280x1280" }],
    },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}