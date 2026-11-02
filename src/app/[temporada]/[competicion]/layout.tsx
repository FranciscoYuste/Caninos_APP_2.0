import type { ReactNode } from "react";
import { CompetitionFrame } from "@/components/team/competition-frame";
import { requireCompetition, type CompetitionParams } from "@/lib/competition-page";

export default async function CompetitionLayout({ children, params }: { children: ReactNode; params: CompetitionParams }) {
    const competition = await requireCompetition(params);
    return <CompetitionFrame competition={competition}>{children}</CompetitionFrame>;
}
