"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { logSitAction, editSitAction, deleteSitAction, setGoalAction } from "./actions";
import {
  SESSIONS,
  CATS,
  CATEGORY_HUE,
  type Entry,
  type Session,
  sessionById,
  todayMinutes,
  calcStreak,
  minutesByDay,
  lastNDays,
  minutesByCategory,
  totalMinutes,
  achievements,
  mmss,
} from "./lib";

// Bloom palette, adapted to the suite's dark/zinc surfaces: the playful violet +
// multicolor blob carry the identity; cards stay zinc so it sits in the shell.
const A = "#8b6ef0"; // accent violet
const PEACH = "#ff9e7d";
const SKY = "#5fb8f0";
const MINT = "#5fd3b2";
const GOOD = "#37b894";
const WARN = "#ff9e7d";

const orb = (hue: number, l = 0.66, c = 0.12) => `oklch(${l} ${c} ${hue})`;

type Tab = "today" | "meditate" | "insights" | "you";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "meditate", label: "Meditate", icon: "meditate" },
  { id: "insights", label: "Insights", icon: "insights" },
  { id: "you", label: "You", icon: "you" },
];

export function MeditationView({ entries, goal: goalProp }: { entries: Entry[]; goal: number }) {
  const [tab, setTab] = useState<Tab>("today");
  const [goal, setGoal] = useState(goalProp);
  const [player, setPlayer] = useState<Session | null>(null);
  const [sheet, setSheet] = useState<{ mode: "add" | "edit"; entry: Entry | null } | null>(null);
  const [toast, setToast] = useState("");
  const [, start] = useTransition();

  // Keep local goal in sync if the server value changes under us.
  useEffect(() => setGoal(goalProp), [goalProp]);

  const streak = useMemo(() => calcStreak(entries), [entries]);
  const today = todayMinutes(entries);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1900);
  }
  function addLog(min: number, label: string, sid: string | null) {
    start(() => logSitAction(min, label, sid));
    flash(`✦ ${min} min logged`);
  }
  function saveEdit(entry: Entry, min: number, label: string, sid: string | null) {
    start(() => editSitAction(entry.id, min, label, sid));
    flash("Sit updated");
  }
  function removeEntry(id: number) {
    start(() => deleteSitAction(id));
    flash("Sit removed");
  }
  function changeGoal(next: number) {
    const g = Math.max(5, Math.min(120, next));
    setGoal(g);
    start(() => setGoalAction(g));
  }

  return (
    <div className="-mt-2 pb-28">
      <Keyframes />
      <TabBar tab={tab} setTab={setTab} />

      {tab === "today" && (
        <Today
          entries={entries}
          goal={goal}
          today={today}
          streak={streak}
          onQuick={addLog}
          onLog={() => setSheet({ mode: "add", entry: null })}
          onPlay={setPlayer}
          onEdit={(e) => setSheet({ mode: "edit", entry: e })}
        />
      )}
      {tab === "meditate" && <Meditate onPlay={setPlayer} />}
      {tab === "insights" && <Insights entries={entries} goal={goal} streak={streak} />}
      {tab === "you" && (
        <You entries={entries} goal={goal} streak={streak} onGoal={changeGoal} />
      )}

      {toast && (
        <div
          className="fixed inset-x-0 z-40 mx-auto flex justify-center px-4"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 1rem)" }}
        >
          <div className="rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg [animation:med-toast_.3s_cubic-bezier(.22,1,.36,1)]">
            {toast}
          </div>
        </div>
      )}

      {sheet && (
        <LogSheet
          mode={sheet.mode}
          entry={sheet.entry}
          onClose={() => setSheet(null)}
          onAdd={addLog}
          onSave={saveEdit}
          onDelete={removeEntry}
        />
      )}

      {player && (
        <Player
          session={player}
          onClose={() => setPlayer(null)}
          onComplete={(s) => {
            addLog(s.min, s.title, s.id);
            setPlayer(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Tab bar ─────────────────────────────

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 bg-zinc-950/80 px-4 py-2 backdrop-blur">
      <div className="flex gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 p-1">
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition"
              style={on ? { background: A, color: "#fff" } : { color: "#a1a1aa" }}
            >
              <Icon name={tb.icon} size={17} color={on ? "#fff" : "#a1a1aa"} sw={on ? 2.1 : 1.8} />
              <span className={on ? "" : "hidden sm:inline"}>{tb.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── Today ─────────────────────────────

function Today({
  entries,
  goal,
  today,
  streak,
  onQuick,
  onLog,
  onPlay,
  onEdit,
}: {
  entries: Entry[];
  goal: number;
  today: number;
  streak: number;
  onQuick: (m: number, label: string, sid: string | null) => void;
  onLog: () => void;
  onPlay: (s: Session) => void;
  onEdit: (e: Entry) => void;
}) {
  const remaining = Math.max(goal - today, 0);
  const rec = sessionById("s1")!;
  const todays = entries.filter((e) => isToday(e.createdAt));

  return (
    <div>
      <Eyebrow>{todayLabel()}</Eyebrow>
      <h2 className="mb-4 mt-0.5 text-2xl font-bold tracking-tight text-zinc-100">{greeting()}</h2>

      <div className="mb-3.5 flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/40 px-5 pb-5 pt-6">
        <BlobHero value={today} goal={goal} />
        <div className="mt-4 text-center text-[13.5px] font-semibold text-zinc-400">
          {remaining > 0 ? (
            <>
              You&rsquo;re <strong className="text-zinc-100">{remaining} min</strong> from today&rsquo;s goal
            </>
          ) : (
            <span style={{ color: GOOD }}>✦ Daily goal complete — nicely done</span>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2.5">
        {[5, 10, 15].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onQuick(m, `Quick ${m}-min sit`, null)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 py-3 transition active:scale-[0.97] hover:border-zinc-700"
          >
            <span className="text-lg font-bold" style={{ color: A }}>+{m}</span>
            <span className="text-[10px] font-semibold tracking-wider text-zinc-500">MIN</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onLog}
          className="flex flex-col items-center gap-0.5 rounded-2xl px-5 py-3 font-semibold text-white transition active:scale-[0.97]"
          style={{ background: A }}
        >
          <Icon name="plus" size={20} color="#fff" />
          <span className="text-[10px] font-bold tracking-wider">LOG</span>
        </button>
      </div>

      <Eyebrow className="mb-2">Recommended for you</Eyebrow>
      <button
        type="button"
        onClick={() => onPlay(rec)}
        className="mb-4 flex w-full items-center gap-3.5 rounded-3xl border border-zinc-800 p-4 text-left transition active:scale-[0.99]"
        style={{ background: hexA(A, 0.08) }}
      >
        <PlayDisc hue={rec.hue} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold text-zinc-100">{rec.title}</div>
          <div className="mt-0.5 text-[12.5px] text-zinc-400">{rec.teacher} · {rec.min} min · {rec.cat}</div>
        </div>
        <Icon name="chevR" size={20} color="#71717a" />
      </button>

      <div
        className="mb-5 flex items-center gap-3 rounded-2xl border border-zinc-800 px-4 py-3"
        style={{ background: hexA(WARN, 0.08) }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: hexA(WARN, 0.18) }}>
          <Icon name="flame" size={22} color={WARN} />
        </div>
        <div className="flex-1">
          <div className="text-[14.5px] font-bold text-zinc-100">{streak}-day streak</div>
          <div className="text-xs text-zinc-400">Keep it alive — log a sit today</div>
        </div>
        <div className="text-2xl font-extrabold" style={{ color: WARN }}>{streak}</div>
      </div>

      <div className="mb-1 flex items-baseline justify-between px-0.5">
        <Eyebrow>Today&rsquo;s sits</Eyebrow>
        <span className="text-xs text-zinc-500">{todays.length} logged</span>
      </div>
      {todays.length === 0 ? (
        <p className="py-5 text-center text-[13.5px] text-zinc-500">No sits yet today. Start with a breath.</p>
      ) : (
        <div>
          {todays.map((e) => (
            <EntryRow key={e.id} entry={e} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function BlobHero({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(value / goal, 1);
  const r = 78;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative flex h-[200px] w-[200px] items-center justify-center">
      <div
        className="absolute h-[168px] w-[168px] [animation:med-breathe_7s_ease-in-out_infinite,med-spin_26s_linear_infinite] motion-reduce:animate-none"
        style={{
          borderRadius: "47% 53% 52% 48% / 51% 47% 53% 49%",
          background: `conic-gradient(from 210deg, ${A}, ${PEACH}, ${SKY}, ${MINT}, ${A})`,
          filter: "blur(2px)",
          opacity: 0.34,
        }}
      />
      <div className="absolute h-[150px] w-[150px] rounded-full bg-zinc-900" />
      <svg width={172} height={172} className="absolute -rotate-90">
        <circle cx={86} cy={86} r={r} fill="none" stroke={hexA(A, 0.18)} strokeWidth={9} />
        <circle
          cx={86}
          cy={86}
          r={r}
          fill="none"
          stroke={A}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          style={{ transition: "stroke-dasharray .9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-[52px] font-bold leading-none tracking-tight text-zinc-100">{value}</div>
        <div className="mt-1 text-[12.5px] font-semibold text-zinc-400">of {goal} min</div>
      </div>
    </div>
  );
}

function EntryRow({ entry, onEdit }: { entry: Entry; onEdit: (e: Entry) => void }) {
  const s = sessionById(entry.sid);
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 px-1 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: s ? orb(s.hue, 0.72) : hexA(A, 0.2) }}
      >
        <Icon name="meditate" size={19} color="#fff" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold text-zinc-100">{entry.label}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{timeLabel(entry.createdAt)}</div>
      </div>
      <div className="text-[15px] font-bold" style={{ color: A }}>
        {entry.minutes}
        <span className="text-[11px] font-semibold text-zinc-500"> min</span>
      </div>
      <button
        type="button"
        onClick={() => onEdit(entry)}
        aria-label="Edit sit"
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      >
        <Icon name="edit" size={16} />
      </button>
    </div>
  );
}

// ───────────────────────────── Meditate ─────────────────────────────

function Meditate({ onPlay }: { onPlay: (s: Session) => void }) {
  const [filter, setFilter] = useState("All");
  const featured = sessionById("s8")!;
  const list = filter === "All" ? SESSIONS : SESSIONS.filter((s) => s.cat === filter);

  return (
    <div>
      <Eyebrow>Library</Eyebrow>
      <h2 className="mb-4 mt-0.5 text-2xl font-bold tracking-tight text-zinc-100">Meditate</h2>

      <button
        type="button"
        onClick={() => onPlay(featured)}
        className="relative mb-4 flex min-h-[150px] w-full flex-col justify-end overflow-hidden rounded-3xl p-5 text-left"
        style={{ background: `linear-gradient(135deg, ${orb(featured.hue, 0.62, 0.13)}, ${orb(featured.hue + 30, 0.5, 0.13)})` }}
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute left-5 top-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
          Featured today
        </div>
        <div className="relative">
          <div className="text-2xl font-bold text-white">{featured.title}</div>
          <div className="mt-1 text-[13px] text-white/85">{featured.teacher} · {featured.min} min</div>
        </div>
        <div className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/95">
          <Icon name="play" size={22} color={orb(featured.hue, 0.55, 0.14)} />
        </div>
      </button>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => {
          const on = filter === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition"
              style={
                on
                  ? { background: A, borderColor: A, color: "#fff" }
                  : { borderColor: "#3f3f46", color: "#a1a1aa" }
              }
            >
              {c}
            </button>
          );
        })}
      </div>

      <div>
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPlay(s)}
            className="flex w-full items-center gap-3.5 border-b border-zinc-800 py-3 text-left"
          >
            <PlayDisc hue={s.hue} size={50} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold text-zinc-100">{s.title}</div>
              <div className="mt-0.5 truncate text-[12.5px] text-zinc-400">{s.blurb}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[15px] font-bold" style={{ color: A }}>
                {s.min}
                <span className="text-[10.5px] text-zinc-500"> min</span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-zinc-500">{s.cat}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── Insights ─────────────────────────────

function Insights({ entries, goal, streak }: { entries: Entry[]; goal: number; streak: number }) {
  const [range, setRange] = useState<"Week" | "Month">("Week");
  const days = range === "Week" ? lastNDays(entries, 7) : lastNDays(entries, 30);
  const windowTotal = days.reduce((s, d) => s + d.min, 0);
  const week7 = lastNDays(entries, 7);
  const activeDays = week7.filter((d) => d.min > 0).length;
  const avg = activeDays ? Math.round(week7.reduce((s, d) => s + d.min, 0) / 7) : 0;
  const best = week7.reduce((a, b) => (b.min > a.min ? b : a), week7[0] ?? { min: 0 });
  const goalHits = week7.filter((d) => d.min >= goal).length;
  const byDay = minutesByDay(entries);
  const cats = minutesByCategory(entries);
  const catMax = Math.max(...cats.map((c) => c[1]), 1);
  const allTime = totalMinutes(entries);
  const chartDays = range === "Week" ? week7 : lastNDays(entries, 14); // keep bars readable

  return (
    <div>
      <Eyebrow>Your practice</Eyebrow>
      <h2 className="mb-4 mt-0.5 text-2xl font-bold tracking-tight text-zinc-100">Insights</h2>

      <div className="mb-4">
        <Seg options={["Week", "Month"]} value={range} onChange={(v) => setRange(v as "Week" | "Month")} />
      </div>

      <Card className="mb-3.5">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-bold leading-none text-zinc-100">
              {windowTotal}
              <span className="text-sm font-semibold text-zinc-400"> min</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">this {range.toLowerCase()}</div>
          </div>
          <div className="text-xs font-semibold" style={{ color: WARN }}>goal {goal}/day</div>
        </div>
        <WeekChart days={chartDays} goal={goal} />
      </Card>

      <div className="mb-3.5 flex gap-2.5">
        <StatTile label="Avg / day" value={`${avg}`} unit="min" icon="clock" />
        <StatTile label="Best day" value={`${best?.min ?? 0}`} unit="min" icon="bolt" />
        <StatTile label="Goal hits" value={`${goalHits}/7`} icon="target" />
      </div>

      <Card className="mb-3.5">
        <div className="mb-3.5 flex items-center justify-between">
          <Eyebrow>Consistency · 4 weeks</Eyebrow>
          <div className="flex gap-4 text-[12.5px] text-zinc-400">
            <span>
              <strong className="text-base font-bold" style={{ color: A }}>{streak}</strong> current
            </span>
          </div>
        </div>
        <StreakDots byDay={byDay} />
      </Card>

      {cats.length > 0 && (
        <Card className="mb-4">
          <Eyebrow className="mb-3.5">By type</Eyebrow>
          <div className="flex flex-col gap-3">
            {cats.map(([c, m]) => (
              <div key={c} className="flex items-center gap-3">
                <div className="w-14 text-[12.5px] font-semibold text-zinc-400">{c}</div>
                <div className="flex-1">
                  <Bar pct={m / catMax} fill={orb(CATEGORY_HUE[c] ?? 200)} />
                </div>
                <div className="w-9 text-right text-[12.5px] text-zinc-400">{m}m</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="pb-1 text-center text-xs text-zinc-500">
        All-time · {Math.floor(allTime / 60)}h {allTime % 60}m across {entries.length} sits
      </p>
    </div>
  );
}

function WeekChart({ days, goal }: { days: { dayAgo: number; dow: string; min: number }[]; goal: number }) {
  const max = Math.max(goal, ...days.map((d) => d.min), 1) * 1.1;
  return (
    <div>
      <div className="relative flex h-[120px] items-end gap-1.5">
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed"
          style={{ bottom: `${(goal / max) * 100}%`, borderColor: hexA(WARN, 0.55) }}
        />
        {days.map((d, i) => {
          const hit = d.min >= goal;
          const h = Math.max((d.min / max) * 100, 2);
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
              <div
                className="w-full max-w-[26px] rounded-md transition-[height] duration-500"
                style={{
                  height: `${h}%`,
                  background: d.min === 0 ? "#27272a" : hit ? A : hexA(A, 0.45),
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] font-semibold"
            style={{ color: d.dayAgo === 0 ? A : "#71717a" }}
          >
            {d.dow}
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakDots({ byDay }: { byDay: Record<number, number> }) {
  const cells = [];
  for (let i = 27; i >= 0; i--) cells.push({ i, on: (byDay[i] || 0) > 0 });
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((c) => (
        <div
          key={c.i}
          title={`${c.i}d ago`}
          className="aspect-square rounded-md"
          style={{
            background: c.on ? A : "#27272a",
            opacity: c.on ? (c.i < 7 ? 1 : 0.78) : 1,
            border: c.i === 0 ? `2px solid ${A}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ───────────────────────────── You ─────────────────────────────

function You({
  entries,
  goal,
  streak,
  onGoal,
}: {
  entries: Entry[];
  goal: number;
  streak: number;
  onGoal: (n: number) => void;
}) {
  const allTime = totalMinutes(entries);
  const badges = achievements(entries, streak);
  const [prefs, setPrefs] = useLocalPrefs();

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: `linear-gradient(135deg, ${A}, ${orb(320, 0.6, 0.12)})` }}
        >
          <Icon name="meditate" size={28} color="#fff" />
        </div>
        <div>
          <div className="text-xl font-bold text-zinc-100">Your practice</div>
          <div className="text-[12.5px] text-zinc-400">
            {Math.floor(allTime / 60)}h {allTime % 60}m logged · {entries.length} sits
          </div>
        </div>
      </div>

      <Card className="mb-3.5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[13.5px] font-bold text-zinc-100">Daily goal</div>
          <div className="text-xs text-zinc-500">minutes / day</div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onGoal(goal - 5)}
            aria-label="Decrease goal"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 text-2xl text-zinc-200 hover:bg-zinc-800"
          >
            −
          </button>
          <div className="w-20 text-center text-[44px] font-bold leading-none" style={{ color: A }}>{goal}</div>
          <button
            type="button"
            onClick={() => onGoal(goal + 5)}
            aria-label="Increase goal"
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-white hover:opacity-90"
            style={{ background: A }}
          >
            +
          </button>
        </div>
      </Card>

      <Eyebrow className="mb-2.5">Achievements</Eyebrow>
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {badges.map((b) => (
          <div
            key={b.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-2 py-3.5 text-center"
            style={{ opacity: b.got ? 1 : 0.45 }}
          >
            <div
              className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: b.got ? orb(b.hue, 0.9, 0.06) : "#27272a" }}
            >
              <Icon name={b.icon} size={19} color={b.got ? orb(b.hue, 0.55, 0.13) : "#71717a"} />
            </div>
            <div className="text-[11px] font-bold text-zinc-200">{b.label}</div>
          </div>
        ))}
      </div>

      <Eyebrow className="mb-1">Settings</Eyebrow>
      <SettingRow icon="bell" title="Morning reminder" sub="7:00 AM daily" right={<Toggle on={prefs.morning} onClick={() => setPrefs({ ...prefs, morning: !prefs.morning })} />} />
      <SettingRow icon="moon" title="Evening wind-down" sub="9:30 PM daily" right={<Toggle on={prefs.evening} onClick={() => setPrefs({ ...prefs, evening: !prefs.evening })} />} />
      <SettingRow icon="wave" title="Ambient sound" sub="Soft rain" right={<Toggle on={prefs.sound} onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} />} />
      <SettingRow icon="target" title="Weekly goal" sub={`${goal * 7} min · ${streak}-day streak`} right={<Icon name="chevR" size={18} color="#71717a" />} />
    </div>
  );
}

function SettingRow({ icon, title, sub, right }: { icon: string; title: string; sub: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: hexA(A, 0.16) }}>
        <Icon name={icon} size={18} color={A} />
      </div>
      <div className="flex-1">
        <div className="text-[14.5px] font-bold text-zinc-100">{title}</div>
        <div className="text-xs text-zinc-500">{sub}</div>
      </div>
      {right}
    </div>
  );
}

// ───────────────────────────── Player ─────────────────────────────

function Player({
  session,
  onClose,
  onComplete,
}: {
  session: Session;
  onClose: () => void;
  onComplete: (s: Session) => void;
}) {
  const total = session.min * 60;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const last = useRef<number | null>(null);

  // Real-time countdown at 1×, robust to backgrounding (delta from wall clock).
  useEffect(() => {
    if (!playing || done) {
      last.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = last.current ? (now - last.current) / 1000 : 0;
      last.current = now;
      setElapsed((e) => {
        const next = e + dt;
        if (next >= total) {
          setDone(true);
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, done, total]);

  const pct = total > 0 ? elapsed / total : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col [animation:med-fade_.28s_ease]"
      style={{ background: `radial-gradient(120% 80% at 50% 0%, ${orb(session.hue, 0.32, 0.08)}, #09090b)` }}
    >
      <div className="flex items-center justify-between px-5 pt-14">
        <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-zinc-300">
          <Icon name="chevD" size={26} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{session.cat}</span>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <div className="relative mb-6 flex h-[230px] w-[230px] items-center justify-center">
          <div
            className={`absolute h-[200px] w-[200px] rounded-full ${playing && !done ? "[animation:med-breathe_5s_ease-in-out_infinite] motion-reduce:animate-none" : ""}`}
            style={{
              background: `radial-gradient(circle at 35% 30%, ${orb(session.hue, 0.78, 0.13)}, ${orb(session.hue, 0.6, 0.14)})`,
              boxShadow: `0 20px 60px ${orb(session.hue, 0.6, 0.14)}`,
            }}
          />
          <div className="absolute h-[200px] w-[200px] rounded-full border border-white/30" />
          <div className="relative text-center text-white">
            {done ? (
              <Icon name="check" size={64} color="#fff" sw={2.4} />
            ) : (
              <div className="text-[13px] tracking-[0.1em] opacity-85">{playing ? "BREATHE" : "PAUSED"}</div>
            )}
          </div>
        </div>
        <div className="text-2xl font-bold text-zinc-100">{session.title}</div>
        <div className="text-[13.5px] text-zinc-400">{session.teacher}</div>
      </div>

      <div className="px-7 pb-10">
        {done ? (
          <div className="text-center">
            <div className="mb-3.5 text-[15px] font-bold" style={{ color: GOOD }}>
              ✦ Session complete — {session.min} min logged
            </div>
            <button
              type="button"
              onClick={() => onComplete(session)}
              className="h-14 w-full rounded-2xl text-base font-bold text-white"
              style={{ background: A }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <Bar pct={pct} h={6} fill={orb(session.hue, 0.6, 0.14)} />
            <div className="mt-2.5 flex justify-between text-[13px] text-zinc-400">
              <span>{mmss(elapsed)}</span>
              <span>−{mmss(total - elapsed)}</span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-7">
              <button
                type="button"
                onClick={() => setElapsed((e) => Math.max(0, e - 15))}
                aria-label="Back 15 seconds"
                className="flex flex-col items-center gap-1 text-xs font-bold text-zinc-400"
              >
                <Icon name="chevL" size={20} />−15s
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
                className="flex h-[74px] w-[74px] items-center justify-center rounded-full text-white"
                style={{ background: A, boxShadow: `0 10px 26px ${hexA(A, 0.4)}` }}
              >
                <Icon name={playing ? "pause" : "play"} size={30} color="#fff" />
              </button>
              <button
                type="button"
                onClick={() => setElapsed((e) => Math.min(total, e + 15))}
                aria-label="Forward 15 seconds"
                className="flex flex-col items-center gap-1 text-xs font-bold text-zinc-400"
              >
                <Icon name="chevR" size={20} />+15s
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Log sheet ─────────────────────────────

function LogSheet({
  mode,
  entry,
  onClose,
  onAdd,
  onSave,
  onDelete,
}: {
  mode: "add" | "edit";
  entry: Entry | null;
  onClose: () => void;
  onAdd: (m: number, label: string, sid: string | null) => void;
  onSave: (e: Entry, m: number, label: string, sid: string | null) => void;
  onDelete: (id: number) => void;
}) {
  const editing = mode === "edit" && !!entry;
  const [min, setMin] = useState(editing ? entry!.minutes : 10);
  const [note, setNote] = useState(editing ? entry!.label : "");
  const [sid, setSid] = useState<string | null>(editing ? entry!.sid : null);

  function save() {
    const label = note.trim() || `${min}-min sit`;
    if (editing) onSave(entry!, min, label, sid);
    else onAdd(min, label, sid);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center [animation:med-fade_.2s_ease]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[84%] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] [animation:med-sheet_.32s_cubic-bezier(.22,1,.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <h3 className="mb-4 text-xl font-bold text-zinc-100">{editing ? "Edit sit" : "Log a sit"}</h3>

        <Eyebrow className="mb-2.5">Minutes</Eyebrow>
        <div className="mb-2 flex flex-wrap gap-2">
          {[3, 5, 10, 15, 20, 30].map((m) => {
            const on = min === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMin(m)}
                className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition"
                style={on ? { background: A, borderColor: A, color: "#fff" } : { borderColor: "#3f3f46", color: "#a1a1aa" }}
              >
                {m} min
              </button>
            );
          })}
        </div>
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMin((m) => Math.max(1, m - 1))}
            aria-label="Minus one minute"
            className="h-10 w-10 rounded-full border border-zinc-700 text-xl text-zinc-200 hover:bg-zinc-800"
          >
            −
          </button>
          <div className="flex-1 text-center text-3xl font-bold" style={{ color: A }}>
            {min}
            <span className="text-sm text-zinc-400"> min</span>
          </div>
          <button
            type="button"
            onClick={() => setMin((m) => m + 1)}
            aria-label="Plus one minute"
            className="h-10 w-10 rounded-full text-xl text-white"
            style={{ background: hexA(A, 0.3) }}
          >
            +
          </button>
        </div>

        <Eyebrow className="mb-2">Note</Eyebrow>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it feel?"
          className="mb-5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
        />

        <Eyebrow className="mb-2.5">Type (optional)</Eyebrow>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {SESSIONS.slice(0, 6).map((s) => {
            const on = sid === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSid(on ? null : s.id)}
                className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition"
                style={on ? { background: A, borderColor: A, color: "#fff" } : { borderColor: "#3f3f46", color: "#a1a1aa" }}
              >
                {s.cat}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2.5">
          {editing && (
            <button
              type="button"
              onClick={() => {
                onDelete(entry!.id);
                onClose();
              }}
              aria-label="Delete sit"
              className="flex h-14 items-center justify-center rounded-2xl border border-rose-500/40 px-4 text-rose-400 hover:bg-rose-500/10"
            >
              <Icon name="trash" size={18} color="currentColor" />
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="h-14 flex-1 rounded-2xl text-base font-bold text-white"
            style={{ background: A }}
          >
            {editing ? "Save changes" : "Log sit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── shared bits ─────────────────────────────

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] text-zinc-500 ${className}`}>
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-zinc-800 bg-zinc-900/40 p-[18px] ${className}`}>{children}</div>
  );
}

function StatTile({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon name={icon} size={15} color={A} sw={2} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[26px] font-bold leading-none text-zinc-100">{value}</span>
        {unit && <span className="text-[12.5px] font-semibold text-zinc-400">{unit}</span>}
      </div>
    </div>
  );
}

function Bar({ pct, h = 9, fill }: { pct: number; h?: number; fill?: string }) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="overflow-hidden rounded-full" style={{ height: h, background: hexA(A, 0.18) }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${p * 100}%`, background: fill || A }}
      />
    </div>
  );
}

function Seg({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-zinc-900 p-1">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition ${
              on ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? A : "#3f3f46" }}
    >
      <span
        className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-[left]"
        style={{ left: on ? 23 : 3 }}
      />
    </button>
  );
}

function PlayDisc({ hue, size }: { hue: number; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: orb(hue, 0.66, 0.12), boxShadow: `0 6px 16px ${orb(hue, 0.66, 0.12)}66` }}
    >
      <Icon name="play" size={Math.round(size * 0.42)} color="#fff" />
    </div>
  );
}

// Local-only UI prefs (reminders/ambient): persisted per device. Not yet wired
// to push notifications — they remember the user's choice for when that lands.
function useLocalPrefs(): [
  { morning: boolean; evening: boolean; sound: boolean },
  (p: { morning: boolean; evening: boolean; sound: boolean }) => void,
] {
  const [prefs, setPrefs] = useState({ morning: true, evening: false, sound: true });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("med.prefs");
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, []);
  function update(p: { morning: boolean; evening: boolean; sound: boolean }) {
    setPrefs(p);
    try {
      localStorage.setItem("med.prefs", JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }
  return [prefs, update];
}

// ───────────────────────────── icons + keyframes ─────────────────────────────

const PATHS: Record<string, string> = {
  today: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4 M12 8a4 4 0 100 8 4 4 0 000-8z",
  meditate: "M12 5c-1.6 2.4-1.6 4 0 6 1.6-2 1.6-3.6 0-6zM12 11c3 .2 4.6 1.4 6 3-2.4 1-4.4.6-6-1zM12 11c-3 .2-4.6 1.4-6 3 2.4 1 4.4.6 6-1zM4 18h16",
  insights: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  you: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6",
  play: "M8 5.5v13l11-6.5z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  chevR: "M9 5l7 7-7 7",
  chevL: "M15 5l-7 7 7 7",
  chevD: "M5 9l7 7 7-7",
  flame: "M12 3c1 3-2 4-2 7a2 2 0 004 0c0-1 .6-1.6 1-2 1 2.4 1 3 1 4a4 4 0 11-8 0c0-3.5 3-5 4-9z",
  bell: "M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0",
  target: "M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 12m-5 0a5 5 0 1010 0 5 5 0 10-10 0M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  trash: "M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13",
  bolt: "M13 3L5 13h6l-1 8 8-10h-6z",
  moon: "M21 13A8 8 0 119 3a6.5 6.5 0 0012 10z",
  leaf: "M5 19c0-8 6-13 14-14 1 9-4 15-14 14zM5 19c3-4 6-6 9-7",
  wave: "M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0",
  clock: "M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M12 7v5l3 2",
  star: "M12 4l2.3 4.8 5.2.7-3.8 3.7.9 5.2L12 16.6 7.4 18.4l.9-5.2L4.5 9.5l5.2-.7z",
};

function Icon({ name, size = 22, color = "currentColor", sw = 1.8 }: { name: string; size?: number; color?: string; sw?: number }) {
  const solid = ["play", "pause", "flame", "bolt", "star"].includes(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={solid ? color : "none"}>
      <path d={PATHS[name]} stroke={solid ? "none" : color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes med-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.07) } }
      @keyframes med-spin { to { transform: rotate(360deg) } }
      @keyframes med-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes med-sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
      @keyframes med-toast { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    `}</style>
  );
}

// ───────────────────────────── tiny helpers ─────────────────────────────

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function isToday(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function todayLabel(): string {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
