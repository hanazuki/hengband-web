// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { mount } from "svelte";
import App from "./App.svelte";
import { registerPwa } from "./pwa.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app element");

registerPwa();

const app = mount(App, { target });

export default app;
