// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./global.css";
import { registerPwa } from "./pwa";
import { UnsupportedBrowser } from "./UnsupportedBrowser";
import { supportsRequiredWasmFeatures } from "./wasm-support";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app element");

async function bootstrap(target: HTMLElement): Promise<void> {
  if (!(await supportsRequiredWasmFeatures())) {
    createRoot(target).render(
      <StrictMode>
        <UnsupportedBrowser />
      </StrictMode>,
    );
    return;
  }

  registerPwa();

  createRoot(target).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap(target);
