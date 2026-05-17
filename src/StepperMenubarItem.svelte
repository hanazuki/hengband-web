<script lang="ts">
import { Menubar } from "bits-ui";
import type { Snippet } from "svelte";
import Stepper from "./Stepper.svelte";

const {
  value,
  min,
  max,
  onChange,
  children,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  children?: Snippet;
} = $props();
</script>

<Menubar.Item>
  {#snippet child({ props })}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div {...props} tabindex={undefined}>
      <span>{@render children?.()}:</span>
      <Stepper {value} {min} {max} {onChange} />
    </div>
  {/snippet}
</Menubar.Item>

<style>
  div {
    display: flex;
    gap: 1ch;
    align-items: baseline;

    span {
      flex: 1;
    }
  }
</style>
