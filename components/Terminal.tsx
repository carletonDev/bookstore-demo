"use client";

import { useEffect, useRef, useState } from "react";

type Line = { text: string; className?: string };

const SCRIPT: Line[] = [
  { text: "> codex --fetch --limit=10000", className: "text-green-400" },
  { text: "" },
  { text: "Indexing: Clean Code... [DONE]" },
  { text: "Indexing: Pragmatic Programmer... [DONE]" },
  {
    text: "Indexing: Structure & Interpretation of Computer Programs... [DONE]",
  },
  { text: "" },
];

const PROGRESS_WIDTH = 20;
const TYPE_SPEED = 30;
const LINE_PAUSE = 400;
const PROGRESS_TICK = 60;

export function Terminal(): React.ReactElement {
  const [lines, setLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [progress, setProgress] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function sleep(ms: number): Promise<void> {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function run(): Promise<void> {
      for (const line of SCRIPT) {
        if (cancelled) return;

        // Type out the line character by character
        for (let i = 0; i <= line.text.length; i++) {
          if (cancelled) return;
          setCurrentLine(line.text.slice(0, i));
          await sleep(TYPE_SPEED);
        }

        // Commit the finished line
        setLines((prev) => [...prev, line]);
        setCurrentLine("");
        await sleep(LINE_PAUSE);
      }

      // Animate the progress bar
      for (let i = 0; i <= PROGRESS_WIDTH; i++) {
        if (cancelled) return;
        setProgress(i);
        await sleep(PROGRESS_TICK);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, currentLine, progress]);

  function renderProgressBar(filled: number): string {
    const pct = Math.round((filled / PROGRESS_WIDTH) * 100);
    const bar = "=".repeat(filled) + " ".repeat(PROGRESS_WIDTH - filled);
    return `[${bar}] ${pct}%`;
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="h-3 w-3 rounded-full bg-yellow-500" />
        <span className="h-3 w-3 rounded-full bg-green-500" />
        <span className="ml-3 text-xs text-zinc-400">codex-terminal</span>
      </div>

      {/* Terminal body */}
      <div className="h-64 overflow-y-auto p-4 font-mono text-sm leading-relaxed text-zinc-300">
        {lines.map((line, i) => (
          <div key={i} className={line.className ?? ""}>
            {line.text || "\u00A0"}
          </div>
        ))}

        {/* Currently typing line */}
        {currentLine !== "" && (
          <div className={SCRIPT[lines.length]?.className ?? ""}>
            {currentLine}
            <span className="animate-pulse">_</span>
          </div>
        )}

        {/* Progress bar */}
        {progress >= 0 && (
          <div className="text-green-400">
            {renderProgressBar(progress)}
            {progress < PROGRESS_WIDTH && (
              <span className="animate-pulse">_</span>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
