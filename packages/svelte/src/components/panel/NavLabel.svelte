<script lang="ts">
  /**
   * A navigation label or tenant name: text, or the sanitised HTML of an `Htmlable` value
   * (`labelHtml` / `nameHtml`, sanitised on the server like other HTML in the schema).
   */
  let {
    text,
    html = false,
    class: className,
  }: { text: string; html?: boolean; class?: string } = $props()
</script>

{#if html}
  <span class={className}>{@html text}</span>
{:else}
  <span class={className}>{text}</span>
{/if}
