// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import styles from "./react-toolchain.module.css";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button className={styles.counter} onClick={() => setCount((value) => value + 1)} type="button">
      Count: {count}
    </button>
  );
}

describe("React toolchain", () => {
  it("renders an interactive component with typed CSS Modules", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button", { name: "Count: 0" });
    expect(button).toHaveClass(styles.counter);

    await user.click(button);
    expect(button).toHaveAccessibleName("Count: 1");
  });
});
