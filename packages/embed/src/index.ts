import { definePulseChatElement } from "./components/pulse-chat-element";

export {
  definePulseChatElement,
  PulseChatElement,
  pulseChatTagName,
} from "./components/pulse-chat-element";
export { mountPulseChat } from "./helpers/mount-pulse-chat";
export type {
  ChatWidgetClient,
  ChatWidgetTheme,
  PulseChatHandle,
  PulseChatOptions,
} from "./types";

definePulseChatElement();
