import { KatsuSection } from "@/components/team/katsu-section";
import { pageMetadata } from "@/lib/metadata";
import { getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Jugador KATSU", "Un reconocimiento especial en cada partido. Pulsa la carta para descubrirlo.");

export default async function KatsuPage() {
    const data = await getTeamData();
    return <KatsuSection katsuCards={data?.katsuCards ?? []} />;
}
