import {
  ChatWidget,
  type ChatWidgetClient,
  type ChatWidgetTheme,
} from "@pulse/chat-widget/unstyled";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { embedStyles } from "../styles/embed";

export const pulseChatTagName = "pulse-chat";

export class PulseChatElement extends HTMLElement {
  static readonly observedAttributes = ["room-id"];

  readonly #mountPoint: HTMLDivElement;
  #client: ChatWidgetClient | null = null;
  #root: Root | null = null;
  #theme: ChatWidgetTheme = {};

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = embedStyles;

    this.#mountPoint = document.createElement("div");
    shadowRoot.append(style, this.#mountPoint);
  }

  get client(): ChatWidgetClient | null {
    return this.#client;
  }

  set client(client: ChatWidgetClient | null) {
    this.#client = client;
    this.#renderWidget();
  }

  get roomId(): string {
    return this.getAttribute("room-id") ?? "";
  }

  set roomId(roomId: string) {
    if (roomId) this.setAttribute("room-id", roomId);
    else this.removeAttribute("room-id");
  }

  get theme(): ChatWidgetTheme {
    return this.#theme;
  }

  set theme(theme: ChatWidgetTheme) {
    this.#theme = theme;
    this.#renderWidget();
  }

  connectedCallback(): void {
    this.#root ??= createRoot(this.#mountPoint);
    this.#renderWidget();
  }

  disconnectedCallback(): void {
    this.#root?.unmount();
    this.#root = null;
  }

  attributeChangedCallback(
    _name: string,
    previousValue: string | null,
    nextValue: string | null,
  ): void {
    if (previousValue !== nextValue) this.#renderWidget();
  }

  #renderWidget(): void {
    if (!this.#root) return;

    if (!this.#client || !this.roomId) {
      this.#root.render(null);
      return;
    }

    this.#root.render(
      createElement(ChatWidget, {
        client: this.#client,
        roomId: this.roomId,
        theme: this.#theme,
      }),
    );
  }
}

export function definePulseChatElement(
  tagName = pulseChatTagName,
): CustomElementConstructor {
  const registeredElement = customElements.get(tagName);
  if (registeredElement) return registeredElement;

  customElements.define(tagName, PulseChatElement);
  return PulseChatElement;
}

declare global {
  interface HTMLElementTagNameMap {
    "pulse-chat": PulseChatElement;
  }
}
