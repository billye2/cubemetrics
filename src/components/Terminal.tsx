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
  const lineBufferRef = useRef<string>("");
  const echoRef = useRef<boolean>(true);
  const pendingRef = useRef<boolean>(false);
  const sendRef = useRef<(input: string, type: "key" | "line" | "refresh") => void>(undefined);
  const [showLineInput, setShowLineInput] = useState(false);
  const [linePrompt, setLinePrompt] = useState("");
  const lineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const fontSize = isMobile ? 11 : 16;

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
      rows: 25,
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

      lineBufferRef.current = "";
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

    // Make [X] menu items clickable
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
          links.push({
            startIndex: match.index,
            length: match[0].length,
            key: match[1],
          });
        }

        if (links.length === 0) { callback(undefined); return; }

        callback(
          links.map((link) => ({
            range: {
              start: { x: link.startIndex + 1, y: bufferLineNumber + 1 },
              end: { x: link.startIndex + link.length + 1, y: bufferLineNumber + 1 },
            },
            text: `[${link.key}]`,
            activate() {
              if (inputModeRef.current === "key") {
                send(link.key, "key");
              }
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
          term.write("\r\n");
          const line = lineBufferRef.current;
          lineBufferRef.current = "";
          setShowLineInput(false);
          send(line, "line");
        } else if (data === "\x7f" || data === "\b") {
          if (lineBufferRef.current.length > 0) {
            lineBufferRef.current = lineBufferRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\x1b") {
          // Escape
        } else if (data >= " ") {
          lineBufferRef.current += data;
          if (echoRef.current) {
            term.write(data);
          } else {
            term.write("*");
          }
        }
      }
    });

    // Initial screen load
    send("", "refresh");

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("message", onMessage);
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
    <div style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden" }}>
      <div
        ref={termRef}
        style={{
          width: "100%",
          height: showLineInput ? "calc(100% - 50px)" : "100%",
          background: "#000",
        }}
      />

      {showLineInput && (
        <form
          onSubmit={handleLineSubmit}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "50px",
            display: "flex",
            background: "#111",
            borderTop: "1px solid #333",
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
