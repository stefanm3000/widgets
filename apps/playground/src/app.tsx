import { PlaygroundHeader } from "./components/playground-header";
import { PlaygroundIntro } from "./components/playground-intro";
import { WidgetDemo } from "./components/widget-demo";

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f2ed] text-[#151713]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(206,255,78,0.22),transparent_28%),radial-gradient(circle_at_85%_5%,rgba(93,134,255,0.16),transparent_26%)]" />

      <PlaygroundHeader />

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:gap-20 lg:px-10 lg:pt-16">
        <PlaygroundIntro />
        <WidgetDemo />
      </section>
    </main>
  );
}
