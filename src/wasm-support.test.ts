// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exceptions, jspi } from "wasm-feature-detect";
import { supportsRequiredWasmFeatures } from "./wasm-support";

vi.mock("wasm-feature-detect", () => ({
  exceptions: vi.fn(),
  jspi: vi.fn(),
}));

const exceptionsMock = vi.mocked(exceptions);
const jspiMock = vi.mocked(jspi);

describe("WebAssembly feature gate", () => {
  beforeEach(() => {
    exceptionsMock.mockReset();
    jspiMock.mockReset();
  });

  it("accepts browsers with JSPI and WebAssembly exceptions", async () => {
    jspiMock.mockResolvedValue(true);
    exceptionsMock.mockResolvedValue(true);

    expect(await supportsRequiredWasmFeatures()).toBe(true);
  });

  it.each([
    { exceptions: true, jspi: false },
    { exceptions: false, jspi: true },
    { exceptions: false, jspi: false },
  ])("rejects browsers missing a required feature: %o", async (features) => {
    jspiMock.mockResolvedValue(features.jspi);
    exceptionsMock.mockResolvedValue(features.exceptions);

    expect(await supportsRequiredWasmFeatures()).toBe(false);
  });

  it("treats detector failures as unsupported", async () => {
    jspiMock.mockRejectedValue(new Error("WebAssembly is unavailable"));
    exceptionsMock.mockResolvedValue(true);

    expect(await supportsRequiredWasmFeatures()).toBe(false);
  });
});
