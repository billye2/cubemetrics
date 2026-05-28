"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface BBSResponse {
  screen: string;
  inputMode: "key" | "line";
  prompt?: string;
  echo?: boolean;
}

function extractMenuKeys(ansiText: string): { key: string; label: string }[] {
  const stripped = ansiText.replace(/\x1b\[[0-9;]*m/g, "");
  const seen = new Set<string>();
  const items: { key: string; label: string }[] = [];

  const regex = /\[([A-Za-z0-9<>])\]\s*([A-Za-z /&'()\-]+)/g;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const key = match[1];
    const label = match[2].trim();
    if (!seen.has(key) && label.length > 1) {
      seen.add(key);
      items.push({ key, label });
    }
  }

  // Also pick up standalone navigation hints like [N]ext [P]rev
  const navRegex = /\[([A-Za-z])\](\w+)/g;
  while ((match = navRegex.exec(stripped)) !== null) {
    const key = match[1];
    const label = key + match[2];
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ key, label });
    }
  }

  return items;
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
  const [menuKeys, setMenuKeys] = useState<{ key: string; label: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const lineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    setIsMobile(mobile);
    const fontSize = mobile ? 10 : 16;

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
      rows: mobile ? 20 : 25,
      scrollback: 0,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

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
        if (response.inputMode === "key") {
          setMenuKeys(extractMenuKeys(response.screen));
        } else {
          setMenuKeys([]);
        }
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

    // Make [X] menu items clickable on all devices
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const line = term.buffer.active.getLine(bufferLineNumber);
        if (!line) { callback(undefined); return; }
        let text = "";
        for (let i = 0; i < line.length; i++) {
          text += line.getCell(i)?.getChars() || " ";
        }
        const links: { startIndex: number; length: number; key: string }[] = [];
        const regex = /\[([A-Za-z0-9<>.!?])\]/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          links.push({ startIndex: match.index, length: match[0].length, key: match[1] });
        }
        if (links.length === 0) { callback(undefined); return; }
        callback(
          links.map((link) => ({
            range: {
              start: { x: link.startIndex + 1, y: bufferLineNumber + 1 },
              end: { x: link.startIndex + link.length + 1, y: bufferLineNumber + 1 },
            },
            text: `[${link.key}]`,
            decorations: {
              underline: false,
              pointerCursor: true,
            },
            activate() {
              if (inputModeRef.current === "key") send(link.key, "key");
            },
          }))
        );
      },
    });

    // Keyboard input
    term.onData((data) => {
      if (pendingRef.current) return;
      if (inputModeRef.current === "key") {
        send(data, "key");
      } else {
        if (data === "\r" || data === "\n") {
          // On desktop, handle Enter in terminal directly
          // On mobile, the input bar handles submission
        } else if (data === "\x7f" || data === "\b") {
          // handled by input bar on mobile
        } else if (data >= " ") {
          // handled by input bar on mobile
        }
      }
    });

    send("", "refresh");

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("message", onMessage);
      term.dispose();
    };
  }, []);

  const handleKeyTap = useCallback((key: string) => {
    sendRef.current?.(key, "key");
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

  const hasBottomBar = isMobile && (menuKeys.length > 0 || showLineInput);
  const barHeight = showLineInput ? 50 : (menuKeys.length > 6 ? 100 : 56);

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

      {isMobile && !showLineInput && menuKeys.length > 0 && (
        <div
          style={{
            background: "#111",
            borderTop: "1px solid #333",
            padding: "6px",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            justifyContent: "center",
          }}
        >
          {menuKeys.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleKeyTap(key)}
              style={{
                background: "#1a1a1a",
                color: "#00AAAA",
                border: "1px solid #333",
                borderRadius: "6px",
                padding: "10px 14px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                minWidth: "60px",
                textAlign: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ color: "#AA5500" }}>[{key}]</span>{" "}
              <span style={{ color: "#AAAAAA", fontWeight: "normal", fontSize: "11px" }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {showLineInput && (
        <form
          onSubmit={handleLineSubmit}
          style={{
            background: "#111",
            borderTop: "1px solid #333",
            display: "flex",
            height: "50px",
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
