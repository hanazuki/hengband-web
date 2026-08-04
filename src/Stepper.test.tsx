// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

afterEach(cleanup);

describe("Stepper", () => {
  it("increments and decrements within its bounds", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Stepper value={8} min={8} max={10} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "-" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onChange).toHaveBeenCalledWith(9);

    rerender(<Stepper value={10} min={8} max={10} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
  });
});
