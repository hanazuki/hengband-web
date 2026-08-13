// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AboutAnalyticsDialog } from "./AboutAnalyticsDialog";
import type { Variant } from "./Menu";

afterEach(cleanup);

function ControlledDialog({ variant }: { variant: Variant }) {
  const [open, setOpen] = useState(true);
  return <AboutAnalyticsDialog variant={variant} open={open} onOpenChange={setOpen} />;
}

describe("AboutAnalyticsDialog", () => {
  it.each([
    ["en", "About Analytics", "Close"],
    ["ja", "アクセス解析について", "閉じる"],
  ] as const)("discloses analytics and closes in %s", async (variant, title, closeLabel) => {
    const user = userEvent.setup();
    render(<ControlledDialog variant={variant} />);

    const dialog = await screen.findByRole("dialog", { name: title });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent("Cloudflare");
    const close = screen.getByRole("button", { name: closeLabel });
    await waitFor(() => expect(close).toHaveFocus());
    await user.click(close);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
