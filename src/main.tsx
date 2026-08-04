// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./global.css";
import { registerPwa } from "./pwa";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app element");

registerPwa();

const root = createRoot(target);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

export default root;
