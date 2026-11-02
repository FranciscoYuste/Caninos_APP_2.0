import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgFrame } from "@/lib/og/frame";
import { findMatchContext } from "@/lib/match-lookup";

export const alt = "Resultado del partido";
export const size = OG_SIZE;
export const contentType = "image/png";

function TeamName({ name }: { name: string }) {
    return <div style={{ display: "flex", width: 360, justifyContent: "center", textAlign: "center", fontSize: 50, fontWeight: 700, lineHeight: 1.1, textTransform: "uppercase" }}>{name}</div>;
}

export default async function MatchOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const found = await findMatchContext(id);
    const match = found?.match;

    return new ImageResponse(
        (
            <OgFrame kicker={found ? `${found.competition.name} · J${found.match.jornada}` : "Partido"} season={found?.competition.season}>
                {match ? (
                    <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <TeamName name={match.home} />
                            <div style={{ display: "flex", padding: "12px 36px", margin: "0 24px", border: `4px solid ${OG_COLORS.lime}`, color: match.finalScore ? OG_COLORS.paper : OG_COLORS.lime, fontSize: match.finalScore ? 110 : 64, fontWeight: 700 }}>
                                {match.finalScore ?? "VS"}
                            </div>
                            <TeamName name={match.away} />
                        </div>
                        <div style={{ display: "flex", marginTop: 40, fontSize: 24, color: OG_COLORS.muted, letterSpacing: 2, textAlign: "center" }}>{match.date}</div>
                        {match.chronicle ? <div style={{ display: "flex", marginTop: 20, fontSize: 26, color: OG_COLORS.lime, letterSpacing: 4 }}>CRÓNICA DISPONIBLE</div> : null}
                    </div>
                ) : <div style={{ display: "flex", fontSize: 48 }}>Partido no encontrado</div>}
            </OgFrame>
        ),
        size,
    );
}
