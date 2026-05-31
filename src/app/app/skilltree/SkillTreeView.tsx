"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { levelFromXp, MAX_LEVEL, RUST_AFTER_DAYS } from "./lib";
import type { Skill, PracticeEntry, SkillStats } from "./page";
import {
  addSkillAction,
  editSkillAction,
  deleteSkillAction,
  logPracticeAction,
  deletePracticeAction,
  addDepAction,
  deleteDepAction,
} from "./actions";

type View = "list" | "tree" | "stats";

export function SkillTreeView({ skills, stats }: { skills: Skill[]; stats: SkillStats }) {
  const [view, setView] = useState<View>("list");
  const [expanded, setExpanded] = useState<number | null>(null);

  const nameById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of skills) m[s.id] = s.name;
    return m;
  }, [skills]);

  const totalXp = skills.reduce((sum, s) => sum + s.xp, 0);
  const maxedCount = skills.filter((s) => s.maxed).length;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Acct Lv" value={String(stats.accountLevel)} tone="cyan" />
        <Stat label="Total XP" value={totalXp.toLocaleString()} />
        <Stat
          label="Streak"
          value={stats.streak > 0 ? `${stats.streak}🔥` : "—"}
          tone={stats.streak > 0 ? "gold" : undefined}
        />
      </div>

      <div className="mb-4 flex rounded-xl bg-zinc-900/60 p-1 ring-1 ring-zinc-800">
        <Tab active={view === "list"} onClick={() => setView("list")}>
          Skills
        </Tab>
        <Tab active={view === "tree"} onClick={() => setView("tree")}>
          Tree
        </Tab>
        <Tab active={view === "stats"} onClick={() => setView("stats")}>
          Stats
        </Tab>
      </div>

      {view === "stats" ? (
        <StatsView skills={skills} stats={stats} />
      ) : (
        <>
          <AddSkill skills={skills} />

          {skills.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
              <p className="text-sm text-zinc-400">No skills yet.</p>
              <p className="mt-1 text-xs text-zinc-500">Add one, then log practice to earn XP and level up.</p>
            </div>
          ) : view === "tree" ? (
            <TreeView skills={skills} nameById={nameById} />
          ) : (
            <div className="mt-5 space-y-3">
              {skills.map((s) => (
                <SkillCard
                  key={s.id}
                  skill={s}
                  skills={skills}
                  nameById={nameById}
                  open={expanded === s.id}
                  onToggle={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "cyan" | "gold" }) {
  const color =
    tone === "cyan" ? "text-cyan-400" : tone === "gold" ? "text-amber-300" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className={`text-xl font-bold tracking-tight ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function LevelBadge({ level, maxed, locked }: { level: number; maxed: boolean; locked: boolean }) {
  const cls = locked
    ? "bg-zinc-800 text-zinc-500 ring-zinc-700"
    : maxed
      ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
      : "bg-cyan-500/20 text-cyan-300 ring-cyan-500/40";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ${cls}`}>
      {locked ? "🔒" : `Lv ${level}`}
    </span>
  );
}

function XpBar({ skill }: { skill: Skill }) {
  const info = levelFromXp(skill.xp);
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${info.maxed ? "bg-amber-400" : "bg-cyan-500"}`}
          style={{ width: `${Math.round(info.progress * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        {info.maxed ? (
          <span className="text-amber-300">Maxed · {skill.xp.toLocaleString()} XP</span>
        ) : (
          <>
            <span>{skill.xp.toLocaleString()} XP</span>
            <span>
              {info.toNext.toLocaleString()} XP to Lv {info.level + 1}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  skills,
  nameById,
  open,
  onToggle,
}: {
  skill: Skill;
  skills: Skill[];
  nameById: Record<number, string>;
  open: boolean;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div
      className={`rounded-2xl border bg-zinc-900/40 p-3 ${
        skill.locked ? "border-zinc-800/60 opacity-80" : "border-zinc-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <LevelBadge level={skill.level} maxed={skill.maxed} locked={skill.locked} />
            <span className="truncate text-sm font-semibold text-zinc-100">{skill.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">{skill.category}</span>
            {skill.rusting && <RustChip idleDays={skill.idleDays} />}
          </div>
          <div className="mt-2">
            <XpBar skill={skill} />
          </div>
        </button>
      </div>

      {skill.locked && (
        <div className="mt-2 rounded-lg bg-zinc-800/50 px-2 py-1.5 text-[11px] text-zinc-400">
          Locked — needs{" "}
          {skill.deps.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <span className="text-zinc-300">{nameById[d.requires_skill_id] ?? "?"}</span> Lv {d.min_level}+
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
          {editing ? (
            <EditSkillForm skill={skill} onDone={() => setEditing(false)} />
          ) : (
            <>
              <LogPractice skill={skill} />
              <Dependencies skill={skill} skills={skills} nameById={nameById} />
              <PracticeHistory skill={skill} />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Edit
                </button>
                <DeleteSkill id={skill.id} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LogPractice({ skill }: { skill: Skill }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const beforeLevel = levelFromXp(skill.xp).level;
  const [leveledTo, setLeveledTo] = useState<number | null>(null);

  function submit(formData: FormData) {
    const xp = Number(formData.get("xp") || 0);
    const minutesRaw = String(formData.get("minutes") || "").trim();
    const minutes = minutesRaw ? Number(minutesRaw) : null;
    const note = String(formData.get("note") || "");
    if (!Number.isFinite(xp) || xp <= 0) return;
    const after = levelFromXp(skill.xp + Math.floor(xp)).level;
    start(async () => {
      await logPracticeAction(skill.id, xp, minutes, note);
      formRef.current?.reset();
      if (after > beforeLevel) {
        setLeveledTo(after);
        setTimeout(() => setLeveledTo(null), 2500);
      }
    });
  }

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Log practice</div>
      <form ref={formRef} action={submit} className="space-y-2">
        <div className="flex gap-2">
          <input
            name="xp"
            type="number"
            min={1}
            inputMode="numeric"
            required
            placeholder="XP"
            className="w-20 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="minutes"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="min (opt)"
            className="w-24 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="note"
            autoComplete="off"
            placeholder="Note (opt)"
            className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-10 w-full rounded-lg bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Logging…" : "+ Log practice"}
        </button>
      </form>
      {leveledTo != null && (
        <div className="mt-2 animate-pulse rounded-lg bg-amber-500/20 px-3 py-2 text-center text-sm font-semibold text-amber-300 ring-1 ring-amber-500/40">
          ⭐ Level up! Now Lv {leveledTo}
        </div>
      )}
    </div>
  );
}

function PracticeHistory({ skill }: { skill: Skill }) {
  if (skill.practice.length === 0) {
    return <div className="text-[11px] text-zinc-600">No practice logged yet.</div>;
  }
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">History</div>
      <ul className="space-y-1">
        {skill.practice.slice(0, 12).map((p) => (
          <PracticeRow key={p.id} entry={p} skillId={skill.id} />
        ))}
      </ul>
    </div>
  );
}

function PracticeRow({ entry, skillId }: { entry: PracticeEntry; skillId: number }) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <li
      className={`flex items-center gap-2 rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-xs ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className="font-semibold text-cyan-300">+{entry.xp}</span>
      <span className="text-zinc-500">{date}</span>
      {entry.minutes != null && <span className="text-zinc-500">· {entry.minutes}m</span>}
      {entry.note && <span className="min-w-0 flex-1 truncate text-zinc-400">{entry.note}</span>}
      <button
        type="button"
        onClick={() => start(() => deletePracticeAction(entry.id, skillId, entry.xp))}
        className="ml-auto rounded p-0.5 text-zinc-600 hover:text-red-400"
        title="Delete entry (subtracts XP)"
      >
        ×
      </button>
    </li>
  );
}

function Dependencies({
  skill,
  skills,
  nameById,
}: {
  skill: Skill;
  skills: Skill[];
  nameById: Record<number, string>;
}) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  // Can't depend on self, or on something that already (directly) requires this skill.
  const reverseReqs = useMemo(() => {
    const set = new Set<number>();
    for (const other of skills) {
      if (other.deps.some((d) => d.requires_skill_id === skill.id)) set.add(other.id);
    }
    return set;
  }, [skills, skill.id]);

  const existing = new Set(skill.deps.map((d) => d.requires_skill_id));
  const options = skills.filter(
    (s) => s.id !== skill.id && !existing.has(s.id) && !reverseReqs.has(s.id),
  );

  function submit(formData: FormData) {
    const requires = Number(formData.get("requires") || 0);
    const minLevel = Number(formData.get("minLevel") || 1);
    if (!requires) return;
    start(async () => {
      await addDepAction(skill.id, requires, minLevel);
      setAdding(false);
    });
  }

  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Prerequisites</div>
      {skill.deps.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {skill.deps.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-lg bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300"
            >
              <span className="min-w-0 flex-1 truncate">
                {nameById[d.requires_skill_id] ?? "?"} <span className="text-zinc-500">Lv {d.min_level}+</span>
              </span>
              <button
                type="button"
                onClick={() => start(() => deleteDepAction(d.id))}
                className="rounded p-0.5 text-zinc-600 hover:text-red-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-2 text-[11px] text-zinc-600">None — this is a root skill.</div>
      )}

      {options.length === 0 ? null : adding ? (
        <form action={submit} className="flex gap-2">
          <select
            name="requires"
            className="min-w-0 flex-1 rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          >
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="minLevel"
            defaultValue={2}
            className="rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          >
            {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>
                Lv {l}+
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
        >
          + Add prerequisite
        </button>
      )}
    </div>
  );
}

function DeleteSkill({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this skill and all its practice history?")) {
          start(() => deleteSkillAction(id));
        }
      }}
      className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-zinc-700 disabled:opacity-50"
    >
      Delete
    </button>
  );
}

function EditSkillForm({ skill, onDone }: { skill: Skill; onDone: () => void }) {
  const [pending, start] = useTransition();
  function submit(formData: FormData) {
    const name = String(formData.get("name") || "");
    const category = String(formData.get("category") || "");
    if (!name.trim()) return;
    start(async () => {
      await editSkillAction(skill.id, name, category);
      onDone();
    });
  }
  return (
    <form action={submit} className="space-y-2">
      <input
        name="name"
        defaultValue={skill.name}
        autoComplete="off"
        placeholder="Skill name"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <input
        name="category"
        defaultValue={skill.category}
        autoComplete="off"
        placeholder="Category"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function AddSkill({ skills }: { skills: Skill[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const categories = useMemo(() => [...new Set(skills.map((s) => s.category))], [skills]);

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "");
    const category = String(formData.get("category") || "");
    if (!name.trim()) return;
    start(async () => {
      await addSkillAction(name, category);
      formRef.current?.reset();
    });
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
      >
        + Add skill
      </button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <input
        name="name"
        autoComplete="off"
        placeholder="Skill name (e.g. Guitar)"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <input
        name="category"
        list="skill-category-options"
        autoComplete="off"
        defaultValue="General"
        placeholder="Category"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <datalist id="skill-category-options">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add skill"}
        </button>
      </div>
    </form>
  );
}

function RustChip({ idleDays }: { idleDays: number | null }) {
  return (
    <span
      title={idleDays != null ? `Untouched for ${idleDays} days` : "Rusty"}
      className="inline-flex items-center gap-0.5 rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300 ring-1 ring-orange-500/30"
    >
      🦀 rusty{idleDays != null ? ` · ${idleDays}d` : ""}
    </span>
  );
}

// --- Stats (P3) -------------------------------------------------------------
// Account level, practice streak, a trailing-8-week XP bar chart, and the list
// of skills that have gone rusty. All read-only — no mutations here.

function StatsView({ skills, stats }: { skills: Skill[]; stats: SkillStats }) {
  const weekMax = Math.max(1, ...stats.weekly.map((w) => w.xp));
  const totalWeeklyXp = stats.weekly.reduce((sum, w) => sum + w.xp, 0);
  const rusty = skills.filter((s) => s.rusting);
  const maxedCount = skills.filter((s) => s.maxed).length;

  if (skills.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-400">No stats yet.</p>
        <p className="mt-1 text-xs text-zinc-500">Add a skill and log practice to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Account Lv" value={String(stats.accountLevel)} tone="cyan" />
        <Stat label="Best streak" value={stats.streak > 0 ? `${stats.streak}` : "—"} />
        <Stat label="Maxed" value={String(maxedCount)} tone={maxedCount > 0 ? "gold" : undefined} />
      </div>

      {/* Weekly XP chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">XP · last 8 weeks</span>
          <span className="text-[10px] text-zinc-500">{totalWeeklyXp.toLocaleString()} XP</span>
        </div>
        <div className="flex h-24 items-end gap-1.5">
          {stats.weekly.map((w, i) => {
            const h = w.xp === 0 ? 4 : Math.max(8, Math.round((w.xp / weekMax) * 100));
            const isLast = i === stats.weekly.length - 1;
            return (
              <div
                key={w.weekStart}
                title={`Week of ${w.weekStart}: ${w.xp} XP`}
                className={`flex-1 rounded-sm transition-all ${
                  w.xp === 0 ? "bg-zinc-800" : isLast ? "bg-cyan-400" : "bg-cyan-500/50"
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-zinc-600">
          <span>8 wks ago</span>
          <span>this week</span>
        </div>
      </div>

      {/* Rust panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Going rusty <span className="text-zinc-600">· idle {RUST_AFTER_DAYS}+ days</span>
        </div>
        {rusty.length === 0 ? (
          <p className="text-xs text-zinc-500">Nothing rusting — every skill has been practiced recently. ✨</p>
        ) : (
          <ul className="space-y-1.5">
            {rusty
              .slice()
              .sort((a, b) => (b.idleDays ?? 0) - (a.idleDays ?? 0))
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-zinc-300">{s.name}</span>
                  <RustChip idleDays={s.idleDays} />
                </li>
              ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] leading-snug text-zinc-600">
          Rust is just a nudge — your XP never drops on its own. Log a session to clear it.
        </p>
      </div>
    </div>
  );
}

// --- Visual tree (P2) -------------------------------------------------------
// Phone-first: skills grouped into vertical tiers by dependency depth, with a
// small connector between tiers. Color encodes state (locked / unlocked / maxed).

function TreeView({ skills, nameById }: { skills: Skill[]; nameById: Record<number, string> }) {
  const tiers = useMemo(() => {
    const byTier = new Map<number, Skill[]>();
    for (const s of skills) {
      const arr = byTier.get(s.tier) ?? [];
      arr.push(s);
      byTier.set(s.tier, arr);
    }
    return [...byTier.entries()].sort((a, b) => a[0] - b[0]);
  }, [skills]);

  return (
    <div className="mt-5 space-y-2">
      {tiers.map(([tier, tierSkills], idx) => (
        <div key={tier}>
          {idx > 0 && <div className="mx-auto h-4 w-px bg-zinc-700" aria-hidden />}
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Tier {tier + 1}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tierSkills.map((s) => (
              <TreeNode key={s.id} skill={s} nameById={nameById} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeNode({ skill, nameById }: { skill: Skill; nameById: Record<number, string> }) {
  const ring = skill.locked
    ? "border-zinc-800 bg-zinc-900/40"
    : skill.maxed
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-cyan-500/40 bg-cyan-500/5";
  const info = levelFromXp(skill.xp);
  return (
    <div className={`rounded-xl border p-2.5 ${ring} ${skill.locked ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-1.5">
        <LevelBadge level={skill.level} maxed={skill.maxed} locked={skill.locked} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100">{skill.name}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${skill.maxed ? "bg-amber-400" : skill.locked ? "bg-zinc-600" : "bg-cyan-500"}`}
          style={{ width: `${Math.round(info.progress * 100)}%` }}
        />
      </div>
      {skill.locked && skill.deps.length > 0 && (
        <div className="mt-1 truncate text-[10px] text-zinc-500">
          needs {nameById[skill.deps[0].requires_skill_id] ?? "?"} Lv {skill.deps[0].min_level}+
          {skill.deps.length > 1 ? ` +${skill.deps.length - 1}` : ""}
        </div>
      )}
      {!skill.locked && skill.rusting && (
        <div className="mt-1 truncate text-[10px] text-orange-300/80">
          🦀 rusty{skill.idleDays != null ? ` · ${skill.idleDays}d idle` : ""}
        </div>
      )}
    </div>
  );
}
