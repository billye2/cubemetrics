import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { KeepInTouchView } from "./KeepInTouchView";

export const dynamic = "force-dynamic";

export type Status = "due" | "soon" | "ok" | "none";

export interface Contact {
  id: number;
  name: string;
  company: string | null;
  cadenceDays: number | null;
  status: Status;
  dueIn: number | null; // days until due (negative = overdue); null when no cadence
  label: string;
}

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function fmtSpan(days: number): string {
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  if (days >= 14) return `${Math.round(days / 7)}w`;
  return `${days}d`;
}

const RANK: Record<string, number> = { due: 0, soon: 1, ok: 2, none: 3 };

export default async function KeepInTouchPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("contacts")
    .select("id, name, company, cadence_days, last_contacted, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(500);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contacts: Contact[] = (data || []).map((c) => {
    const cadenceDays = (c.cadence_days as number) ?? null;
    const lastStr = (c.last_contacted as string) ?? null;

    let status: Status = "none";
    let dueIn: number | null = null;
    let label = "no cadence set";

    if (cadenceDays && cadenceDays > 0) {
      if (lastStr) {
        const nextDue = parseDate(lastStr);
        nextDue.setDate(nextDue.getDate() + cadenceDays);
        dueIn = dayDiff(today, nextDue);
        if (dueIn <= 0) {
          status = "due";
          label = dueIn === 0 ? "due today" : `${-dueIn}d overdue`;
        } else {
          status = dueIn <= 7 ? "soon" : "ok";
          label = `due in ${fmtSpan(dueIn)}`;
        }
      } else {
        status = "due";
        dueIn = 0;
        label = "never reached out";
      }
    } else if (lastStr) {
      const ago = dayDiff(parseDate(lastStr), today);
      label = ago <= 0 ? "contacted today" : `last contacted ${fmtSpan(ago)} ago`;
    }

    return {
      id: c.id as number,
      name: c.name as string,
      company: (c.company as string) ?? null,
      cadenceDays,
      status,
      dueIn,
      label,
    };
  });

  contacts.sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    if (a.dueIn !== null && b.dueIn !== null) return a.dueIn - b.dueIn;
    return 0;
  });

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Keep in Touch">
      <KeepInTouchView contacts={contacts} />
    </Shell>
  );
}
