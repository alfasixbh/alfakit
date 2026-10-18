<script lang="ts">
  let { state, tone }: { state?: unknown; tone?: string } = $props()
</script>

<mark data-tone={tone}>{String(state)}</mark>
