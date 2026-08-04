import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { MayoDashboard } from "@/components/mayo/mayo-dashboard";

export default async function MayoPage() {
  const session = await auth();
  if (!session?.user || session.user.type === "guest") {
    redirect("/login");
  }
  return <MayoDashboard />;
}
