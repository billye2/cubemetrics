"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface BBSResponse {
  screen: string;
  inputMode: "key" | "line";
  prompt?: string;
  echo?: boolean;
}

const ACTION_KEYS: { label: string; send: string }[] = [
  { label: "1", send: "1" },
  { label: "2", send: "2" },
  { label: "3", send: "3" },
  { label: "4", send: "4" },
  { label: "5", send: "5" },
  { label: "6", send: "6" },
  { label: "7", send: "7" },
  { label: "8", send: "8" },
  { label: "9", send: "9" },
  { label: "0", send: "0" },
  { label: "/", send: "/" },
  { label: "!", send: "!" },
  { label: "P", send: "P" },
  { label: "N", send: "N" },
  { label: "Q", send: "Q" },
];

// Heuristic: line prompts that suggest long-form content get a fullscreen modal
const MODAL_PROMPT_PATTERNS = /describe|body|content|message|entry|journal|note|comment|reply|story|details/i;

export default function Terminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const inputModeRef = useRef<"key" | "line">("key");
  const echoRef = useRef<boolean>(true);
  const pendingRef = useRef<boolean>(false);
  const sendRef = useRef<(input: string, type: "key" | "line" | "refresh") => void>(undefined);
  const colsRef = useRef<number>(80);
  const isMobileRef = useRef<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const [showLineInput, setShowLineInput] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [linePrompt, setLinePrompt] = useState("");
  const [inputModeState, setInputModeState] = useState<"key" | "line">("key");
  const [isMobile, setIsMobile] = useState(false);
  const [echoState, setEchoState] = useState(true);
  const lineInputRef = useRef<HTMLInputElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    isMobileRef.current = mobile;
    setIsMobile(mobile);

    const narrow = mobile && window.innerWidth < 600;
    const cols = narrow ? 40 : 80;
    colsRef.current = cols;

    const containerWidth = termRef.current?.clientWidth || window.innerWidth;
    const charWidthRatio = 0.6;
    const maxFontSize = mobile ? 18 : 16;
    const fittedFontSize = Math.floor(containerWidth / (cols * charWidthRatio));
    const fontSize = Math.min(maxFontSize, Math.max(8, fittedFontSize));

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'IBM Plex Mono', 'Courier New', 'Consolas', monospace",
      fontSize,
      theme: {
        background: "#000000",
        foreground: "#AAAAAA",
        cursor: "#FFFFFF",
        black: "#000000",
        red: "#AA0000",
        green: "#00AA00",
        yellow: "#AA5500",
        blue: "#0000AA",
        magenta: "#AA00AA",
        cyan: "#00AAAA",
        white: "#AAAAAA",
        brightBlack: "#000000",
        brightRed: "#AA0000",
        brightGreen: "#00AA00",
        brightYellow: "#AA5500",
        brightBlue: "#0000AA",
        brightMagenta: "#AA00AA",
        brightCyan: "#00AAAA",
        brightWhite: "#AAAAAA",
      },
      cols,
      rows: mobile ? 24 : 25,
      scrollback: 0,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);

    xtermRef.current = term;

    async function sendToServer(
      input: string,
      inputType: "key" | "line" | "refresh"
    ): Promise<BBSResponse> {
      const res = await fetch("/api/bbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, inputType, cols: colsRef.current }),
        credentials: "include",
      });
      return res.json();
    }

    function handleResponse(response: BBSResponse) {
      if (response.prompt === "__OAUTH_GOOGLE__") {
        if (response.screen) term.write(response.screen);
        openOAuthPopup();
        pendingRef.current = false;
        return;
      }

      if (response.screen) {
        term.write(response.screen);
      }

      inputModeRef.current = response.inputMode;
      echoRef.current = response.echo !== false;
      setInputModeState(response.inputMode);
      setEchoState(response.echo !== false);

      if (response.inputMode === "line") {
        const promptText = (response.prompt || "").replace(/\x1b\[[0-9;]*m/g, "").trim();
        setLinePrompt(promptText);
        setShowLineInput(true);
        if (response.prompt) term.write(response.prompt);

        const useModal = isMobileRef.current && MODAL_PROMPT_PATTERNS.test(promptText);
        setShowLineModal(useModal);
        setTimeout(() => {
          if (useModal) modalTextareaRef.current?.focus();
          else lineInputRef.current?.focus();
        }, 100);
      } else {
        setShowLineInput(false);
        setShowLineModal(false);
        setLinePrompt("");
        // On mobile in key mode, blur xterm's hidden textarea so the soft keyboard stays down
        if (isMobileRef.current) term.blur();
      }

      pendingRef.current = false;
    }

    function send(input: string, type: "key" | "line" | "refresh") {
      if (pendingRef.current && type !== "refresh") return;
      pendingRef.current = true;
      sendToServer(input, type).then(handleResponse);
    }

    sendRef.current = send;

    function openOAuthPopup() {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        "/api/auth/login",
        "bbs_auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }

    function onMessage(event: MessageEvent) {
      if (event.data === "auth_complete") {
        send("", "refresh");
      }
    }
    window.addEventListener("message", onMessage);

    function getRowText(rowIndex: number): string {
      const line = term.buffer.active.getLine(rowIndex);
      if (!line) return "";
      let text = "";
      for (let i = 0; i < line.length; i++) {
        text += line.getCell(i)?.getChars() || " ";
      }
      return text;
    }

    function findMenuKeyOnRow(text: string, col: number): string | null {
      const regex = /\[([A-Za-z0-9<>.!?])\]\s*([A-Za-z /&'()\-]*)/g;
      const matches: { key: string; start: number; end: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ key: m[1], start: m.index, end: m.index + m[0].trimEnd().length });
      }
      // Exact match: click inside [X] Label span
      for (const match of matches) {
        if (col >= match.start && col < match.end) return match.key;
      }
      // Loose match: click anywhere on a row with exactly one [X] activates it
      if (matches.length === 1) return matches[0].key;
      return null;
    }

    const screenEl = termRef.current?.querySelector(".xterm-screen") as HTMLElement | null;
    const containerEl = termRef.current;

    function tapPosition(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } | null {
      if ("changedTouches" in e && e.changedTouches.length > 0) {
        return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
      }
      if ("clientX" in e) return { clientX: e.clientX, clientY: e.clientY };
      return null;
    }

    function handleTouchStart(e: TouchEvent) {
      const t = e.changedTouches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }

    function handleTouchEnd(e: TouchEvent) {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (inputModeRef.current !== "key" || pendingRef.current) return;

      const t = e.changedTouches[0];
      if (start) {
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const dt = Date.now() - start.t;
        // Swipe-right from inside the screen (not edge) = Q (back)
        if (start.x > 40 && dx > 60 && Math.abs(dy) < 40 && dt < 500) {
          e.preventDefault();
          e.stopPropagation();
          send("Q", "key");
          return;
        }
        // If finger moved noticeably, treat as scroll/swipe, not a tap
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
      }

      handleTermTap(e);
    }

    function handleTermTap(e: MouseEvent | TouchEvent) {
      if (inputModeRef.current !== "key" || pendingRef.current) return;
      const rect = screenEl?.getBoundingClientRect();
      if (!rect) return;
      const pos = tapPosition(e);
      if (!pos) return;

      const cellWidth = rect.width / term.cols;
      const cellHeight = rect.height / term.rows;
      const col = Math.floor((pos.clientX - rect.left) / cellWidth);
      const row = Math.floor((pos.clientY - rect.top) / cellHeight);

      if (row < 0 || row >= term.rows || col < 0 || col >= term.cols) return;

      const text = getRowText(row);
      const key = findMenuKeyOnRow(text, col);
      if (key) {
        e.preventDefault();
        e.stopPropagation();
        send(key, "key");
      }
    }

    if (screenEl) {
      screenEl.addEventListener("click", handleTermTap);
    }
    if (containerEl) {
      containerEl.addEventListener("touchstart", handleTouchStart, { passive: true });
      containerEl.addEventListener("touchend", handleTouchEnd);
    }

    term.onData((data) => {
      if (pendingRef.current) return;
      if (inputModeRef.current === "key") {
        send(data, "key");
      }
    });

    send("", "refresh");

    return () => {
      window.removeEventListener("message", onMessage);
      if (screenEl) screenEl.removeEventListener("click", handleTermTap);
      if (containerEl) {
        containerEl.removeEventListener("touchstart", handleTouchStart);
        containerEl.removeEventListener("touchend", handleTouchEnd);
      }
      term.dispose();
    };
  }, []);

  function submitLine(value: string) {
    const term = xtermRef.current;
    if (term) {
      if (echoRef.current) {
        term.write(value + "\r\n");
      } else {
        term.write("*".repeat(value.length) + "\r\n");
      }
    }
    setShowLineInput(false);
    setShowLineModal(false);
    sendRef.current?.(value, "line");
  }

  function handleLineSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = lineInputRef.current?.value || "";
    if (lineInputRef.current) lineInputRef.current.value = "";
    submitLine(input);
  }

  function handleModalSubmit() {
    const input = modalTextareaRef.current?.value || "";
    if (modalTextareaRef.current) modalTextareaRef.current.value = "";
    submitLine(input);
  }

  function handleModalCancel() {
    if (modalTextareaRef.current) modalTextareaRef.current.value = "";
    submitLine("");
  }

  const showActionBar = isMobile && inputModeState === "key" && !showLineInput;

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        ref={termRef}
        style={{
          flex: 1,
          minHeight: 0,
          background: "#000",
          touchAction: "manipulation",
        }}
      />

      {showActionBar && (
        <div
          role="toolbar"
          aria-label="BBS quick keys"
          style={{
            display: "flex",
            gap: "6px",
            padding: "6px 8px",
            background: "#0a0a0a",
            borderTop: "1px solid #222",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            flexShrink: 0,
          }}
        >
          {ACTION_KEYS.map((k) => (
            <button
              key={k.send}
              type="button"
              onClick={() => sendRef.current?.(k.send, "key")}
              style={{
                flex: "0 0 auto",
                minWidth: "44px",
                height: "44px",
                background: "#111",
                color: "#00AAAA",
                border: "1px solid #333",
                borderRadius: "8px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {showLineInput && !showLineModal && (
        <form
          onSubmit={handleLineSubmit}
          style={{
            background: "#111",
            borderTop: "1px solid #333",
            display: "flex",
            minHeight: "50px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "#AA5500",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "14px",
              padding: "12px 8px 12px 12px",
              whiteSpace: "nowrap",
              maxWidth: "40%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {linePrompt || ">"}
          </span>
          <input
            ref={lineInputRef}
            type={echoState ? "text" : "password"}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              background: "#000",
              color: "#AAAAAA",
              border: "none",
              outline: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "16px",
              padding: "12px 8px",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#00AAAA",
              color: "#000",
              border: "none",
              padding: "0 20px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            SEND
          </button>
        </form>
      )}

      {showLineInput && showLineModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #333",
              background: "#111",
            }}
          >
            <button
              type="button"
              onClick={handleModalCancel}
              style={{
                background: "transparent",
                color: "#AAAAAA",
                border: "none",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <span
              style={{
                color: "#AA5500",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "14px",
                fontWeight: "bold",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                margin: "0 12px",
              }}
            >
              {linePrompt || "Input"}
            </span>
            <button
              type="button"
              onClick={handleModalSubmit}
              style={{
                background: "#00AAAA",
                color: "#000",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
          <textarea
            ref={modalTextareaRef}
            autoFocus
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck
            style={{
              flex: 1,
              background: "#000",
              color: "#AAAAAA",
              border: "none",
              outline: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "16px",
              padding: "16px",
              resize: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
