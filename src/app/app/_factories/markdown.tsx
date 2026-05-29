import type { ReactNode } from "react";

/**
 * Tiny, dependency-free Markdown renderer for short journal/logbook bodies.
 * Supports: # / ## / ### headings, - / * bullets, 1. ordered lists,
 * - [ ] / - [x] task items (read-only), **bold**, *italic*, `code`, and bare
 * http(s) links. Renders React nodes only (no raw HTML), so it's XSS-safe.
 */

const INLINE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(https?:\/\/[^\s]+)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] != null) {
      out.push(<strong key={k++} className="font-semibold text-zinc-100">{m[2]}</strong>);
    } else if (m[4] != null) {
      out.push(<em key={k++}>{m[4]}</em>);
    } else if (m[6] != null) {
      out.push(
        <code key={k++} className="rounded bg-zinc-800 px-1 py-0.5 text-[0.85em] text-cyan-200">
          {m[6]}
        </code>,
      );
    } else if (m[7] != null) {
      out.push(
        <a
          key={k++}
          href={m[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-cyan-400 underline hover:text-cyan-300"
        >
          {m[7]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BULLET = /^\s*[-*]\s+/;
const ORDERED = /^\s*\d+\.\s+/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;

export function renderMarkdown(text: string): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "mt-2 text-base font-semibold text-zinc-100"
          : level === 2
          ? "mt-2 text-sm font-semibold text-zinc-100"
          : "mt-1 text-sm font-semibold text-zinc-300";
      blocks.push(
        <div key={key++} className={cls}>
          {inline(h[2])}
        </div>,
      );
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        const raw = lines[i].replace(BULLET, "");
        const task = TASK.exec(raw);
        if (task) {
          const checked = task[1].toLowerCase() === "x";
          items.push(
            <li key={key++} className="flex items-start gap-2">
              <span className={checked ? "text-emerald-400" : "text-zinc-500"} aria-hidden>
                {checked ? "☑" : "☐"}
              </span>
              <span className={checked ? "text-zinc-500 line-through" : undefined}>
                {inline(task[2])}
              </span>
            </li>,
          );
        } else {
          items.push(
            <li key={key++} className="flex items-start gap-2">
              <span className="text-zinc-600" aria-hidden>
                •
              </span>
              <span>{inline(raw)}</span>
            </li>,
          );
        }
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1 space-y-1">
          {items}
        </ul>,
      );
      continue;
    }

    if (ORDERED.test(line)) {
      const items: ReactNode[] = [];
      let n = 1;
      while (i < lines.length && ORDERED.test(lines[i])) {
        const raw = lines[i].replace(ORDERED, "");
        items.push(
          <li key={key++} className="flex items-start gap-2">
            <span className="tabular-nums text-zinc-600">{n}.</span>
            <span>{inline(raw)}</span>
          </li>,
        );
        n++;
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-1 space-y-1">
          {items}
        </ol>,
      );
      continue;
    }

    // Paragraph: gather consecutive plain lines, preserving their line breaks.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="break-words">
        {para.map((p, idx) => (
          <span key={idx}>
            {idx > 0 && <br />}
            {inline(p)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="space-y-1.5 text-sm text-zinc-300">{blocks}</div>;
}
