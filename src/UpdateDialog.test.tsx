// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateDialog } from "./UpdateDialog";

afterEach(cleanup);

function ControlledDialog({
  onConfirm = vi.fn(),
  currentVersion = "v1.2.2+4",
  version = "v1.2.3+1",
}: {
  onConfirm?: () => void;
  currentVersion?: string;
  version?: string | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <UpdateDialog
      variant="en"
      currentVersion={currentVersion}
      version={version}
      open={open}
      onOpenChange={setOpen}
      onConfirm={onConfirm}
    />
  );
}

describe("UpdateDialog", () => {
  it("displays the upcoming version", async () => {
    render(<ControlledDialog />);

    expect(
      await screen.findByText("A new version of the app (v1.2.3+1) is available."),
    ).toBeInTheDocument();
  });

  it("displays the save compatibility warning when the base version differs", async () => {
    render(<ControlledDialog />);

    expect(await screen.findByText(/Existing save data may be incompatible/)).toBeVisible();
  });

  it("hides the save compatibility warning when only the version after + differs", async () => {
    render(<ControlledDialog currentVersion="v1.2.3+1" version="v1.2.3+2" />);

    expect(screen.queryByText(/Existing save data may be incompatible/)).not.toBeInTheDocument();
  });

  it("displays the save compatibility warning when the upcoming version is unavailable", async () => {
    render(<ControlledDialog version={null} />);

    expect(await screen.findByText(/Existing save data may be incompatible/)).toBeVisible();
  });

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
