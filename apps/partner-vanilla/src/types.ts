import type { PulseClient } from "@pulse/sdk";

export interface PartnerPageElements {
  mountButton: HTMLButtonElement;
  status: HTMLElement;
  themeButton: HTMLButtonElement;
  unmountButton: HTMLButtonElement;
  widgetHost: HTMLElement;
}

export interface WidgetController {
  readonly client: PulseClient;
  readonly mounted: boolean;
  readonly theme: "light" | "dark";
  mount(): void;
  setTheme(theme: "light" | "dark"): void;
  unmount(): void;
}
