import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { WorkspacePage, PageHeading } from "@/components/workspace/workspace-ui";
import { MascotStudio } from "@/components/mascot/mascot-studio";

export const metadata: Metadata = { title: "O C em movimento", robots: { index: false, follow: false } };

export default async function MascotPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fmascot");
  return <WorkspacePage><PageHeading title="O C em movimento." description="Uma prévia das poses, da presença e das animações do personagem do Curricule." /><MascotStudio /></WorkspacePage>;
}
