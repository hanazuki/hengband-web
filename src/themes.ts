import type { ITheme } from "@xterm/xterm";

export interface ThemeEntry {
  slug: string;
  name: string;
  theme: ITheme;
}

// biome-ignore lint/suspicious/noExplicitAny: YAML modules typed as any
const modules = import.meta.glob<{ default: any }>("../themes/*.yml", { eager: true });

function goghToXterm(raw: Record<string, string>): ITheme {
  return {
    background: raw.background,
    foreground: raw.foreground,
    cursor: raw.cursor,
    black: raw.color_01,
    red: raw.color_02,
    green: raw.color_03,
    yellow: raw.color_04,
    blue: raw.color_05,
    magenta: raw.color_06,
    cyan: raw.color_07,
    white: raw.color_08,
    brightBlack: raw.color_09,
    brightRed: raw.color_10,
    brightGreen: raw.color_11,
    brightYellow: raw.color_12,
    brightBlue: raw.color_13,
    brightMagenta: raw.color_14,
    brightCyan: raw.color_15,
    brightWhite: raw.color_16,
  };
}

export const themes: ThemeEntry[] = Object.entries(modules)
  .map(([filePath, mod]) => {
    const slug = filePath.replace(/^.*\/([^/]+)\.ya?ml$/, "$1");
    return {
      slug,
      name: String(mod.default.name || slug),
      theme: goghToXterm(mod.default),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const defaultThemeSlug = "solarized-dark";

export const getTheme = (slug: string): ThemeEntry => {
  const entry =
    themes.find((theme) => theme.slug === slug) ??
    themes.find((theme) => theme.slug === defaultThemeSlug);
  if (!entry) throw new Error(`Theme not found: ${slug}`);
  return entry;
};
