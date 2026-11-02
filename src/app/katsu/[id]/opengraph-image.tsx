import { ImageResponse } from "next/og";
import { ESCUDO_DATA_URL } from "@/lib/og/escudo";
import { OG_COLORS, OG_SIZE, OgFrame } from "@/lib/og/frame";
import { findMatchContext } from "@/lib/match-lookup";

export const alt = "Carta del Jugador KATSU boca abajo";
export const size = OG_SIZE;
export const contentType = "image/png";

// La carta se muestra boca abajo a propósito: el nombre solo se ve dentro de la web.
export default async function KatsuOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const found = await findMatchContext(id);
    const card = found?.katsu;
    const jornada = String(card?.jornada ?? 0).padStart(2, "0");

    return new ImageResponse(
        (
            <OgFrame kicker="Jugador KATSU" season={found?.competition.season}>
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
                        <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, textTransform: "uppercase" }}>¿Quién se lleva la carta?</span>
                        {card ? <span style={{ fontSize: 30, color: OG_COLORS.muted, marginTop: 24 }}>{card.home} vs {card.away}</span> : null}
                        <span style={{ fontSize: 30, color: OG_COLORS.lime, letterSpacing: 4, marginTop: 24 }}>ENTRA Y DESCÚBRELO →</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: 330,
                            height: 440,
                            padding: 28,
                            border: `4px solid ${OG_COLORS.lime}`,
                            backgroundImage: "linear-gradient(160deg, #55592c 0%, #25291d 45%, #111311 100%)",
                            transform: "rotate(4deg)",
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ESCUDO_DATA_URL} width={90} height={90} alt="" />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: 44, fontWeight: 700, textTransform: "uppercase" }}>Jugador</span>
                            <span style={{ fontSize: 88, fontWeight: 700, color: OG_COLORS.lime, lineHeight: 1 }}>KATSU</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: 20, color: OG_COLORS.muted, letterSpacing: 4 }}>JORNADA</span>
                            <span style={{ fontSize: 72, fontWeight: 700 }}>{jornada}</span>
                        </div>
                    </div>
                </div>
            </OgFrame>
        ),
        size,
    );
}
