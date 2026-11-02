import { ImageResponse } from "next/og";
import { FEATURED_TEAM } from "@/lib/config";
import { ESCUDO_DATA_URL } from "@/lib/og/escudo";
import { OG_COLORS, OG_SIZE, OgFrame } from "@/lib/og/frame";

export const alt = FEATURED_TEAM;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <OgFrame kicker="Fútbol sala">
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 700, lineHeight: 1, textTransform: "uppercase" }}>
                        <span>Un equipo.</span>
                        <span style={{ color: OG_COLORS.lime }}>Dos rodillas</span>
                        <span>sanas.</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ESCUDO_DATA_URL} width={300} height={300} alt="" />
                </div>
            </OgFrame>
        ),
        size,
    );
}
