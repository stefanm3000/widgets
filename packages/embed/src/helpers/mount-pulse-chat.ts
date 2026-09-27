import {
  definePulseChatElement,
  pulseChatTagName,
  type PulseChatElement,
} from "../components/pulse-chat-element";
import type { PulseChatHandle, PulseChatOptions } from "../types";

export function mountPulseChat(
  container: Element | ShadowRoot,
  options: PulseChatOptions,
): PulseChatHandle {
  definePulseChatElement();

  const element = document.createElement(pulseChatTagName) as PulseChatElement;
  element.client = options.client;
  element.roomId = options.roomId;
  element.theme = options.theme ?? {};
  container.append(element);

  return {
    destroy() {
      element.remove();
    },
    element,
    update(nextOptions) {
      if (nextOptions.client) element.client = nextOptions.client;
      if (nextOptions.roomId !== undefined) element.roomId = nextOptions.roomId;
      if (nextOptions.theme !== undefined) element.theme = nextOptions.theme;
    },
  };
}
