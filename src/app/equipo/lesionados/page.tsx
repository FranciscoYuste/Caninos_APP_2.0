import { InjuriesSection } from "@/components/team/injuries-section";
import { pageMetadata } from "@/lib/metadata";
import { getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Lesionados", "Parte médico del equipo.");

export default async function InjuriesPage() {
    const data = await getTeamData();
    return <InjuriesSection squad={data?.squad ?? []} />;
}
