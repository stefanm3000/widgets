import { IntegrationExample } from "./components/integration-example";
import { WidgetDemo } from "./components/widget-demo";

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f2ed] text-[#151713]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(206,255,78,0.22),transparent_28%),radial-gradient(circle_at_85%_5%,rgba(93,134,255,0.16),transparent_26%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-5 py-8 sm:px-8 md:py-12">
        <div className="grid w-full items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-10">
          <IntegrationExample />
          <WidgetDemo />
        </div>
      </section>
    </main>
  );
}
