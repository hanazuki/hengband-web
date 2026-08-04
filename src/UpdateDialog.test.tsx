// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateDialog } from "./UpdateDialog";

afterEach(cleanup);

function ControlledDialog({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(true);
  return <UpdateDialog variant="en" open={open} onOpenChange={setOpen} onConfirm={onConfirm} />;
}

describe("UpdateDialog", () => {
  it("focuses cancel and closes without confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ControlledDialog onConfirm={onConfirm} />);

    const cancel = await screen.findByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toHaveFocus());
    await user.click(cancel);

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("confirms the update and closes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ControlledDialog onConfirm={onConfirm} />);

    await user.click(await screen.findByRole("button", { name: "Update" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
