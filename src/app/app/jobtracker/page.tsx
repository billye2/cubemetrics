import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { JobTrackerView } from "./JobTrackerView";

export const dynamic = "force-dynamic";

export interface Application {
  id: number;
  company: string;
  role: string;
  stage: string;
  applied_on: string | null;
}

export default async function JobTrackerPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("job_applications")
    .select("id, company, role, stage, applied_on, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const applications: Application[] = (data || []).map((a) => ({
    id: a.id as number,
    company: a.company as string,
    role: (a.role as string) ?? "",
    stage: (a.stage as string) ?? "saved",
    applied_on: (a.applied_on as string) ?? null,
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Job Hunt">
      <JobTrackerView applications={applications} />
    </Shell>
  );
}
