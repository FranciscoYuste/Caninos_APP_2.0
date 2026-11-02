import { CallupsSection } from "@/components/team/callups-section";
import { pageMetadata } from "@/lib/metadata";
import { getEmptyMessage, getTeamData } from "@/lib/team-data";

export const metadata = pageMetadata("Convocatorias", "Quién fue convocado y quién no en cada partido.");

export default async function CallupsPage() {
    const data = await getTeamData();
    return <CallupsSection results={data?.results ?? []} emptyMessage={getEmptyMessage(data)} />;
}
