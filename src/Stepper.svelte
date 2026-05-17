<script lang="ts">
const {
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span onclick={(e) => e.stopPropagation()}
  ><button disabled={value <= min} onclick={() => onChange(value - 1)}>-</button
  ><output>{value}</output
  ><button disabled={value >= max} onclick={() => onChange(value + 1)}>+</button
></span>

<style>
  button {
    &::before { content: "["; }
    &::after { content: "]"; }

    appearance: none;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &:disabled {
      color: var(--bright-black);
      cursor: default;
    }
  }

  output {
    margin-inline: 1ch;
  }
</style>
