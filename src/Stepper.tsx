// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import styles from "./Stepper.module.css";

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
}

export function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <span className={styles.stepper}>
      <button
        disabled={value <= min}
        onClick={(event) => {
          event.stopPropagation();
          onChange(value - 1);
        }}
        type="button"
      >
        -
      </button>
      <output>{value}</output>
      <button
        disabled={value >= max}
        onClick={(event) => {
          event.stopPropagation();
          onChange(value + 1);
        }}
        type="button"
      >
        +
      </button>
    </span>
  );
}
