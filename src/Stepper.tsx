// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
import styles from "./Stepper.module.css";

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
  onChange(value: number): void;
}

export function Stepper({
  value,
  min,
  max,
  decrementLabel,
  incrementLabel,
  onChange,
}: StepperProps) {
  return (
    <span className={styles.stepper}>
      <button
        aria-label={decrementLabel}
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
        aria-label={incrementLabel}
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
