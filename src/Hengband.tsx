// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import "@xterm/xterm/css/xterm.css";
import styles from "./Hengband.module.css";
import { type UseHengbandOptions, useHengband } from "./useHengband";

export type HengbandProps = UseHengbandOptions;

export function Hengband(props: HengbandProps) {
  const { containerRef, error } = useHengband(props);

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.terminal} data-testid="terminal" ref={containerRef} />
    </>
  );
}
