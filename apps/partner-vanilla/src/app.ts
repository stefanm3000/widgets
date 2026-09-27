import { renderPartnerPage } from "./components/partner-page";
import { getApiUrl } from "./helpers/config";
import { createPartnerClient } from "./helpers/demo-client";
import { createWidgetController } from "./helpers/widget-controller";

export function startPartnerApp(root: HTMLElement): void {
  const elements = renderPartnerPage(root);
  const client = createPartnerClient(getApiUrl());
  const widget = createWidgetController(elements.widgetHost, client);

  const syncControls = () => {
    elements.mountButton.disabled = widget.mounted;
    elements.unmountButton.disabled = !widget.mounted;
    elements.status.textContent = widget.mounted
      ? `Chat mounted · ${widget.theme} theme`
      : "Chat unmounted";
    elements.widgetHost.toggleAttribute("data-empty", !widget.mounted);
    elements.themeButton.textContent =
      widget.theme === "light" ? "Use dark theme" : "Use light theme";
  };

  elements.mountButton.addEventListener("click", () => {
    widget.mount();
    syncControls();
  });
  elements.unmountButton.addEventListener("click", () => {
    widget.unmount();
    syncControls();
  });
  elements.themeButton.addEventListener("click", () => {
    widget.setTheme(widget.theme === "light" ? "dark" : "light");
    syncControls();
  });

  globalThis.addEventListener(
    "pagehide",
    () => {
      widget.unmount();
      widget.client.dispose();
    },
    { once: true },
  );

  widget.mount();
  syncControls();
}
