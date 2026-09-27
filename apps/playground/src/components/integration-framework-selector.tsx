import {
  integrationFrameworks,
  integrationSnippets,
  isIntegrationFramework,
  type IntegrationFramework,
} from "../helpers/integration-code";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

interface IntegrationFrameworkSelectorProps {
  onChange: (framework: IntegrationFramework) => void;
  value: IntegrationFramework;
}

export function IntegrationFrameworkSelector({
  onChange,
  value,
}: IntegrationFrameworkSelectorProps) {
  return (
    <ToggleGroup
      aria-label="Integration framework"
      className="grid w-full grid-cols-4 bg-white/5 p-0.5"
      onValueChange={(framework) => {
        if (isIntegrationFramework(framework)) onChange(framework);
      }}
      type="single"
      value={value}
    >
      {integrationFrameworks.map((framework) => (
        <ToggleGroupItem
          aria-label={`${integrationSnippets[framework].label} integration`}
          className="h-7 px-2 text-[10px] tracking-normal text-white/45 normal-case hover:text-white data-[state=on]:bg-white/10 data-[state=on]:text-white data-[state=on]:shadow-none"
          key={framework}
          value={framework}
        >
          {integrationSnippets[framework].label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
