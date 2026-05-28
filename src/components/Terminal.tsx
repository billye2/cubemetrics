"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!termRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'IBM Plex Mono', 'Courier New', 'Consolas', monospace",
      fontSize: 16,
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
      // Check for OAuth signal
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
      if (response.inputMode === "line" && response.prompt) {
        term.write(response.prompt);
      }
      lineBufferRef.current = "";
      pendingRef.current = false;
    }

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

    // Listen for auth completion from popup
    function onMessage(event: MessageEvent) {
      if (event.data === "auth_complete") {
        sendToServer("", "refresh").then(handleResponse);
      }
    }
    window.addEventListener("message", onMessage);

    // Initial screen load
    sendToServer("", "refresh").then(handleResponse);

    term.onData((data) => {
      if (pendingRef.current) return;

      if (inputModeRef.current === "key") {
        pendingRef.current = true;
        sendToServer(data, "key").then(handleResponse);
      } else {
        if (data === "\r" || data === "\n") {
          term.write("\r\n");
          const line = lineBufferRef.current;
          lineBufferRef.current = "";
          pendingRef.current = true;
          sendToServer(line, "line").then(handleResponse);
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

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("message", onMessage);
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={termRef}
      className="terminal-container"
      style={{ width: "100vw", height: "100vh", background: "#000" }}
    />
  );
}
