// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import styles from "./UnsupportedBrowser.module.css";

export function UnsupportedBrowser() {
  return (
    <main className={styles.container}>
      <h1>
        <span className={styles.headingLine} lang="ja">
          このブラウザはサポートされていません
        </span>
        <span className={styles.headingLine} lang="en">
          Your browser is not supported
        </span>
      </h1>
      <p lang="ja">
        このブラウザは変愚蛮怒ブラウザ版の実行に必要なWebAssembly機能に対応していません。以下の対応ブラウザをご利用ください。
      </p>
      <p lang="en">
        Your browser does not support the WebAssembly features required to run Hengband Web. Please
        use one of the supported browsers listed below.
      </p>
      <ul className={styles.browsers}>
        <li>Chrome 137+</li>
        <li>Edge 137+</li>
        <li>Firefox 153+</li>
        <li>Safari 27+</li>
      </ul>
    </main>
  );
}
