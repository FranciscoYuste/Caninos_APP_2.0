import { ImageResponse } from "next/og";
import { imageAsDataUrl, OG_COLORS, OG_SIZE, OgFrame } from "@/lib/og/frame";
import { getTeamData } from "@/lib/team-data";

export const alt = "Ficha del jugador";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function PlayerOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const player = (await getTeamData())?.squad.find((item) => item.id === id);
    const photo = await imageAsDataUrl(player?.photo);
    const initials = player?.name.split(" ").map((part) => part[0]).join("").slice(0, 3) ?? "";

    return new ImageResponse(
        (
            <OgFrame kicker="Ficha de jugador">
                {player ? (
                    <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
                        <div style={{ display: "flex", width: 340, height: 420, alignItems: "center", justifyContent: "center", border: `4px solid ${OG_COLORS.lime}`, backgroundColor: OG_COLORS.panel, overflow: "hidden" }}>
                            {photo
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={photo} width={340} height={420} style={{ objectFit: "cover", objectPosition: "top" }} alt="" />
                                : <span style={{ fontSize: 140, fontWeight: 700, color: OG_COLORS.lime }}>{initials}</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, flex: 1 }}>
                            <span style={{ fontSize: 120, fontWeight: 700, fontStyle: "italic", color: OG_COLORS.lime, lineHeight: 1 }}>{player.number ?? "—"}</span>
                            <span style={{ fontSize: 64, fontWeight: 700, textTransform: "uppercase", lineHeight: 1.05, marginTop: 8 }}>{player.name}</span>
                            <span style={{ fontSize: 28, color: OG_COLORS.muted, letterSpacing: 4, textTransform: "uppercase", marginTop: 12 }}>{player.position}</span>
                            <div style={{ display: "flex", marginTop: 36 }}>
                                {[{ value: player.goals, label: "GOLES" }, { value: player.assists, label: "ASIST." }, { value: player.games, label: "CONV." }].map((stat) => (
                                    <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 44 }}>
                                        <span style={{ fontSize: 64, fontWeight: 700 }}>{stat.value}</span>
                                        <span style={{ fontSize: 20, color: OG_COLORS.muted, letterSpacing: 3 }}>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : <div style={{ display: "flex", fontSize: 48 }}>Jugador no encontrado</div>}
            </OgFrame>
        ),
        size,
    );
}
