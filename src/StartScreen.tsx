// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import styles from "./StartScreen.module.css";

export function StartScreen() {
  return (
    <main className={styles.startScreen}>
      <h1 className={styles.title}>
        <span lang="ja">変愚蛮怒</span> @ <span lang="en">Hengband</span>
      </h1>
      <div className={styles.message}>
        <p lang="ja">言語を選択してください。</p>
        <p lang="en">Choose your language.</p>
      </div>
      <div className={styles.languageChooser}>
        <a href="#ja">
          <span lang="ja">日本語</span>
        </a>
        <a href="#en">
          <span lang="en">English</span>
        </a>
      </div>
    </main>
  );
}
