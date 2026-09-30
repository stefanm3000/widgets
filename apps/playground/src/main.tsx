import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@pulse/chat-widget/styles.css";

import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Playground root element is missing");

createRoot(root).render(
  <StrictMode>
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </StrictMode>,
);
