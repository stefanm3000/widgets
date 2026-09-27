import { FeatureCard } from "./feature-card";
import { IntegrationExample } from "./integration-example";
import { Badge } from "./ui/badge";

const features = [
  { number: "01", title: "Short-lived tokens" },
  { number: "02", title: "Cursor replay" },
  { number: "03", title: "Themeable UI" },
];

export function PlaygroundIntro() {
  return (
    <div className="max-w-2xl">
      <Badge className="mb-6">
        <span className="size-1.5 rounded-full bg-[#78951e]" />
        Reference integration
      </Badge>
      <h1 className="max-w-xl text-5xl leading-[0.97] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
        Live chat,
        <br />
        ready to embed.
      </h1>
      <p className="mt-7 max-w-xl text-base leading-7 text-[#62665e] sm:text-lg">
        A browser SDK and composable React widget with authenticated history,
        resumable WebSockets, and reconnect handling built in.
      </p>

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.number} {...feature} />
        ))}
      </div>

      <IntegrationExample />
    </div>
  );
}
