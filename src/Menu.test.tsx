// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu, type MenuProps } from "./Menu";

afterEach(cleanup);

function renderMenu(overrides: Partial<MenuProps> = {}) {
  const props: MenuProps = {
    variant: "en",
    fontSize: 14,
    soundEnabled: true,
    musicEnabled: true,
    musicVolume: 5,
    effectsVolume: 5,
    onFontSizeChange: vi.fn(),
    onSoundEnabledChange: vi.fn(),
    onMusicEnabledChange: vi.fn(),
    onMusicVolumeChange: vi.fn(),
    onEffectsVolumeChange: vi.fn(),
    ...overrides,
  };

  render(<Menu {...props} />);
  return props;
}

describe("Menu", () => {
  it("renders localized top-level menus", () => {
    renderMenu({ variant: "ja" });

    expect(screen.getByRole("menubar")).toHaveTextContent("変愚蛮怒");
    expect(screen.getByRole("menuitem", { name: "ゲーム" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "表示" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "音声" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "ヘルプ" })).toBeVisible();
  });

  it.each([
    ["en", "Game", "Update available"],
    ["ja", "ゲーム", "アップデートが利用可能です"],
  ] as const)("labels an available update in %s", async (variant, menuLabel, updateLabel) => {
    const user = userEvent.setup();
    renderMenu({ variant, onUpdate: vi.fn() });

    expect(screen.getByRole("img", { name: updateLabel })).toBeVisible();
    await user.click(screen.getByRole("menuitem", { name: new RegExp(menuLabel) }));

    expect(await screen.findByRole("img", { name: updateLabel })).toBeVisible();
  });

  it("changes a stepped value without closing its menu", async () => {
    const user = userEvent.setup();
    const props = renderMenu();

    await user.click(screen.getByRole("menuitem", { name: "View" }));
    expect(await screen.findByRole("menuitem", { name: "Font size" })).toBeVisible();
    const increment = await screen.findByRole("button", { name: "Increase" });
    await user.click(increment);

    expect(props.onFontSizeChange).toHaveBeenCalledWith(15);
    expect(increment).toBeVisible();
  });

  it("changes checkbox items and disables unavailable help", async () => {
    const user = userEvent.setup();
    const props = renderMenu();

    await user.click(screen.getByRole("menuitem", { name: "Audio" }));
    const music = await screen.findByRole("menuitemcheckbox", { name: "Music" });
    expect(music).toHaveAttribute("aria-checked", "true");
    await user.click(music);
    expect(props.onMusicEnabledChange).toHaveBeenCalledWith(false, expect.anything());

    await user.click(screen.getByRole("menuitem", { name: "Help" }));
    const onlineHelp = await screen.findByRole("menuitem", { name: "Online help" });
    expect(onlineHelp).toHaveAttribute("aria-disabled", "true");
  });

  it("restores focus to the trigger when a menu closes", async () => {
    const user = userEvent.setup();
    renderMenu({ onOnlineHelp: vi.fn() });

    const help = screen.getByRole("menuitem", { name: "Help" });
    await user.click(help);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(help).toHaveFocus());
  });
});
