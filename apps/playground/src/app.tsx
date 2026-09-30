import { IntegrationExample } from "./components/integration-example";
import { WidgetDemo } from "./components/widget-demo";

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-page text-page-foreground">
      <div className="pointer-events-none fixed inset-0 bg-(image:--page-glow)" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-5 py-8 sm:px-8 md:py-12">
        <div className="grid w-full gap-6 md:grid-cols-2 lg:gap-10">
          <IntegrationExample />
          <WidgetDemo />
        </div>
      </section>
    </main>
  );
}
