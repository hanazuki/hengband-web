# Changelog

## Unreleased

- Fix crash on ill-formed input when number is expected (rest turns, goto line, etc.)
- No longer install app updates automatically. A new version now waits until the player accepts it from the menu, so an update cannot interrupt a game in progress.

## v3.0.2.3-Beta+2 (2026-05-26)

- Auto-focus the terminal on game start and after opening the online help menu.
- Yield to JavaScript event loop while auto-rolling so that the browser tab does not hang.

## v3.0.2.3-Beta+1 (2026-05-25)

- Upgrade base game to 3.0.2.3-Beta

## v3.0.2.2-Beta+9 (2026-05-25)

- Clarify software licenses.

## v3.0.2.2-Beta+8 (2026-05-19)

- Support sending scores to the score server.

## v3.0.2.2-Beta+7 (2026-05-17)

- Introduce sound effects and background music.

## v3.0.2.2-Beta+6 (2026-05-16)

- Revert: De-asyncify WASM.

## v3.0.2.2-Beta+5 (2026-05-15)

- Enforce minimal terminal dimensions to prevent the game from crashing on very small windows.
- De-asyncify WASM.

## v3.0.2.2-Beta+4 (2026-05-09)

- Add "Online Help" menu for those who don't know how to open the in-game help.
- Fix the width of symbols such as ★.
