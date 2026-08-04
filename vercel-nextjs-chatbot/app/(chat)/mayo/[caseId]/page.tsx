import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { MayoCaseWorkspace } from "@/components/mayo/mayo-case-workspace";

export default async function MayoCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const [session, { caseId }] = await Promise.all([auth(), params]);
  if (!session?.user || session.user.type === "guest") {
    redirect("/login");
  }
  return <MayoCaseWorkspace caseId={caseId} />;
}
