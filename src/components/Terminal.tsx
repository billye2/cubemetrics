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

export default function Terminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const inputModeRef = useRef<"key" | "line">("key");
  const echoRef = useRef<boolean>(true);
  const pendingRef = useRef<boolean>(false);
  const sendRef = useRef<(input: string, type: "key" | "line" | "refresh") => void>(undefined);
  const [showLineInput, setShowLineInput] = useState(false);
  const [linePrompt, setLinePrompt] = useState("");
  const lineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const containerWidth = termRef.current?.clientWidth || window.innerWidth;
    const charWidthRatio = 0.6;
    const maxFontSize = isMobile ? 14 : 16;
    const fittedFontSize = Math.floor(containerWidth / (80 * charWidthRatio));
    const fontSize = Math.min(maxFontSize, Math.max(6, fittedFontSize));

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
      cols: 80,
      rows: isMobile ? 24 : 25,
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
        body: JSON.stringify({ input, inputType }),
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

      if (response.inputMode === "line") {
        const prompt = response.prompt || "";
        setLinePrompt(prompt.replace(/\x1b\[[0-9;]*m/g, "").trim());
        setShowLineInput(true);
        if (response.prompt) term.write(response.prompt);
        setTimeout(() => lineInputRef.current?.focus(), 100);
      } else {
        setShowLineInput(false);
        setLinePrompt("");
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

    // Click/tap: detect [X] menu items at click position
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
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].trimEnd().length;
        if (col >= start && col < end) {
          return match[1];
        }
      }
      return null;
    }

    const screenEl = termRef.current?.querySelector(".xterm-screen") as HTMLElement | null;

    function handleTermClick(e: MouseEvent | TouchEvent) {
      if (inputModeRef.current !== "key" || pendingRef.current) return;

      const rect = screenEl?.getBoundingClientRect();
      if (!rect) return;

      let clientX: number, clientY: number;
      if ("changedTouches" in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      const cellWidth = rect.width / term.cols;
      const cellHeight = rect.height / term.rows;
      const col = Math.floor((clientX - rect.left) / cellWidth);
      const row = Math.floor((clientY - rect.top) / cellHeight);

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
      screenEl.addEventListener("click", handleTermClick);
      screenEl.addEventListener("touchend", handleTermClick);
    }

    // Keyboard input
    term.onData((data) => {
      if (pendingRef.current) return;
      if (inputModeRef.current === "key") {
        send(data, "key");
      }
    });

    send("", "refresh");

    return () => {
      window.removeEventListener("message", onMessage);
      if (screenEl) {
        screenEl.removeEventListener("click", handleTermClick);
        screenEl.removeEventListener("touchend", handleTermClick);
      }
      term.dispose();
    };
  }, []);

  function handleLineSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = lineInputRef.current?.value || "";
    const term = xtermRef.current;
    if (term) {
      if (echoRef.current) {
        term.write(input + "\r\n");
      } else {
        term.write("*".repeat(input.length) + "\r\n");
      }
    }
    if (lineInputRef.current) lineInputRef.current.value = "";
    setShowLineInput(false);
    sendRef.current?.(input, "line");
  }

  return (
    <div style={{ width: "100vw", height: "100dvh", background: "#000", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        ref={termRef}
        style={{
          flex: 1,
          minHeight: 0,
          background: "#000",
        }}
      />

      {showLineInput && (
        <form
          onSubmit={handleLineSubmit}
          style={{
            background: "#111",
            borderTop: "1px solid #333",
            display: "flex",
            height: "50px",
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
            }}
          >
            {linePrompt || ">"}
          </span>
          <input
            ref={lineInputRef}
            type={echoRef.current ? "text" : "password"}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              flex: 1,
              background: "#000",
              color: "#AAAAAA",
              border: "none",
              outline: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "14px",
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
    </div>
  );
}
