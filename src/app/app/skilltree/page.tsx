import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { SkillTreeView } from "./SkillTreeView";
import {
  levelFromXp,
  computeTiers,
  isLocked,
  accountLevel,
  practiceStreak,
  weeklyXp,
  rustInfo,
  isoToDay,
  type DepEdge,
  type WeekBucket,
} from "./lib";

export const dynamic = "force-dynamic";

export interface PracticeEntry {
  id: number;
  skill_id: number;
  xp: number;
  minutes: number | null;
  note: string;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  xp: number;
  level: number;
  maxed: boolean;
  locked: boolean;
  tier: number;
  deps: { id: number; requires_skill_id: number; min_level: number }[];
  practice: PracticeEntry[];
  /** ISO of the most recent practice session (null = never). */
  lastPracticedAt: string | null;
  /** Whole days since last practice (null = never). */
  idleDays: number | null;
  /** Idle beyond the grace window — surfaced as a "rusty" hint (non-destructive). */
  rusting: boolean;
}

export interface SkillStats {
  /** Sum of every skill's level. */
  accountLevel: number;
  /** Consecutive-day practice streak (any skill). */
  streak: number;
  /** Trailing-8-week XP buckets, oldest first. */
  weekly: WeekBucket[];
  /** How many skills are currently rusting. */
  rustingCount: number;
}

export default async function SkillTreePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: skillRows } = await supabase
    .from("skills")
    .select("id, name, category, xp, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(300);

  const base = skillRows || [];
  const ids = base.map((s) => s.id as number);

  // Dependency edges + practice history, scoped to this user's skills.
  const depsBySkill: Record<number, DepEdge[]> = {};
  const depRowsBySkill: Record<number, { id: number; requires_skill_id: number; min_level: number }[]> = {};
  const practiceBySkill: Record<number, PracticeEntry[]> = {};

  if (ids.length > 0) {
    const [{ data: depRows }, { data: practiceRows }] = await Promise.all([
      supabase
        .from("skill_deps")
        .select("id, skill_id, requires_skill_id, min_level")
        .eq("user_id", user.id)
        .in("skill_id", ids)
        .limit(2000),
      supabase
        .from("skill_practice")
        .select("id, skill_id, xp, minutes, note, created_at")
        .eq("user_id", user.id)
        .in("skill_id", ids)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    for (const d of depRows || []) {
      const sid = d.skill_id as number;
      (depsBySkill[sid] ??= []).push({
        requires_skill_id: d.requires_skill_id as number,
        min_level: d.min_level as number,
      });
      (depRowsBySkill[sid] ??= []).push({
        id: d.id as number,
        requires_skill_id: d.requires_skill_id as number,
        min_level: d.min_level as number,
      });
    }
    for (const p of practiceRows || []) {
      (practiceBySkill[p.skill_id as number] ??= []).push({
        id: p.id as number,
        skill_id: p.skill_id as number,
        xp: p.xp as number,
        minutes: (p.minutes as number) ?? null,
        note: (p.note as string) ?? "",
        created_at: p.created_at as string,
      });
    }
  }

  const levelBySkill: Record<number, number> = {};
  for (const s of base) {
    levelBySkill[s.id as number] = levelFromXp(s.xp as number).level;
  }

  const tiers = computeTiers(ids, depsBySkill);

  const skills: Skill[] = base.map((s) => {
    const id = s.id as number;
    const info = levelFromXp(s.xp as number);
    const deps = depsBySkill[id] ?? [];
    // practice rows arrive newest-first, so [0] is the latest session.
    const hist = practiceBySkill[id] ?? [];
    const lastPracticedAt = hist.length > 0 ? hist[0].created_at : null;
    const rust = rustInfo(lastPracticedAt);
    return {
      id,
      name: s.name as string,
      category: (s.category as string) ?? "General",
      xp: info.xp,
      level: info.level,
      maxed: info.maxed,
      locked: isLocked(deps, levelBySkill),
      tier: tiers[id] ?? 0,
      deps: depRowsBySkill[id] ?? [],
      practice: hist,
      lastPracticedAt,
      idleDays: rust.idleDays,
      rusting: rust.rusting,
    };
  });

  // Account-wide P3 stats: a single account level, a practice streak, and a
  // trailing-8-week XP chart aggregated across every skill.
  const allPractice = Object.values(practiceBySkill).flat();
  const practiceDays = new Set(allPractice.map((p) => isoToDay(p.created_at)));
  const stats: SkillStats = {
    accountLevel: accountLevel(base.map((s) => s.xp as number)),
    streak: practiceStreak(practiceDays),
    weekly: weeklyXp(allPractice.map((p) => ({ xp: p.xp, created_at: p.created_at }))),
    rustingCount: skills.filter((s) => s.rusting).length,
  };

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Skill Tree">
      <SkillTreeView skills={skills} stats={stats} />
    </Shell>
  );
}
