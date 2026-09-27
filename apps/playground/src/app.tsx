import { ChatWidget, type ChatWidgetTheme } from "@pulse/chat-widget";
import type { PulseClient } from "@pulse/sdk";
import { type FormEvent, useState } from "react";

import { createDemoClient } from "./demo-client";

const roomId = "demo-room";
const themeOptions = ["system", "light", "dark"] as const;

type ThemePreset = NonNullable<ChatWidgetTheme["preset"]>;

interface DemoSession {
  client: PulseClient;
  displayName: string;
  id: string;
}

function getApiUrl(): string {
  return new URL(
    import.meta.env.VITE_PULSE_API_URL ?? "/api/",
    globalThis.location.href,
  ).toString();
}

function defaultDisplayName(): string {
  const savedName = globalThis.localStorage?.getItem("pulse-demo-name")?.trim();
  if (savedName) return savedName;
  return `Guest ${Math.floor(100 + Math.random() * 900)}`;
}

function createSession(baseUrl: string, displayName: string): DemoSession {
  return {
    client: createDemoClient(baseUrl, displayName),
    displayName,
    id: globalThis.crypto.randomUUID(),
  };
}

const integrationCode = `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})

<ChatWidget client={client} roomId="support-room" />`;

export function App() {
  const [apiUrl] = useState(getApiUrl);
  const [session, setSession] = useState(() =>
    createSession(apiUrl, defaultDisplayName()),
  );
  const [displayName, setDisplayName] = useState(session.displayName);
  const [theme, setTheme] = useState<ThemePreset>("system");

  const applyIdentity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) return;

    session.client.dispose();
    globalThis.localStorage?.setItem("pulse-demo-name", nextName);
    setSession(createSession(apiUrl, nextName));
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f2ed] text-[#151713]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(206,255,78,0.22),transparent_28%),radial-gradient(circle_at_85%_5%,rgba(93,134,255,0.16),transparent_26%)]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a className="flex items-center gap-2.5" href="/">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#171914] text-sm font-black text-[#d8ff68] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
            P
          </span>
          <span className="text-sm font-bold tracking-[-0.02em]">Pulse</span>
        </a>
        <div className="flex items-center gap-2 text-xs font-medium text-[#62665e]">
          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
          SDK playground
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-20 lg:px-10 lg:pt-16">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-[#55594f] uppercase backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#78951e]" />
            Reference integration
          </div>
          <h1 className="max-w-xl text-5xl leading-[0.97] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Live chat,
            <br />
            ready to embed.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#62665e] sm:text-lg">
            A browser SDK and composable React widget with authenticated
            history, resumable WebSockets, and reconnect handling built in.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <Feature number="01" title="Short-lived tokens" />
            <Feature number="02" title="Cursor replay" />
            <Feature number="03" title="Themeable UI" />
          </div>

          <div className="mt-10 rounded-3xl border border-black/10 bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)]">
            <div className="flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
              <span>Partner integration</span>
              <span>React</span>
            </div>
            <pre className="overflow-x-auto rounded-[18px] bg-[#10120f] p-5 text-[12px] leading-6 text-[#d5d9cc]">
              <code>{integrationCode}</code>
            </pre>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[480px]">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-bold tracking-[0.11em] text-[#777b72] uppercase">
                Signed in as
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {session.displayName}
              </p>
            </div>
            <button
              className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              onClick={() =>
                globalThis.open(
                  globalThis.location.href,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              type="button"
            >
              Open second tab
            </button>
          </div>

          <div className="rounded-[32px] border border-black/10 bg-white/50 p-2.5 shadow-[0_32px_90px_rgba(35,39,29,0.16)] backdrop-blur-xl">
            <ChatWidget
              client={session.client}
              key={session.id}
              roomId={roomId}
              theme={{ preset: theme, radius: "22px" }}
            />
          </div>

          <div className="mt-4 grid gap-3 rounded-3xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur sm:grid-cols-[1fr_auto]">
            <form
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
              onSubmit={applyIdentity}
            >
              <label className="sr-only" htmlFor="display-name">
                Demo display name
              </label>
              <input
                className="min-w-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-black/35 focus:border-black/30 focus:ring-2 focus:ring-black/5"
                id="display-name"
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display name"
                value={displayName}
              />
              <button
                className="rounded-xl bg-[#1a1c17] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                type="submit"
              >
                Apply
              </button>
            </form>

            <div
              aria-label="Widget theme"
              className="grid grid-cols-3 rounded-xl bg-black/5 p-1"
              role="group"
            >
              {themeOptions.map((option) => (
                <button
                  aria-pressed={theme === option}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize text-[#6c7067] transition aria-pressed:bg-white aria-pressed:text-black aria-pressed:shadow-sm"
                  key={option}
                  onClick={() => setTheme(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 px-2 text-center text-[11px] leading-5 text-[#777b72]">
            Messages are shared across sessions. Open another tab with a
            different identity to test realtime delivery.
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ number, title }: { number: string; title: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/45 p-4 backdrop-blur-sm">
      <span className="text-[10px] font-bold text-[#8a8e84]">{number}</span>
      <p className="mt-4 text-sm font-semibold tracking-[-0.01em]">{title}</p>
    </div>
  );
}
