import { startPartnerApp } from "./app";
import "./styles/index.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Partner app root element is missing");

startPartnerApp(root);
