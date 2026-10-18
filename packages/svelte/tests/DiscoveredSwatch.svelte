<script lang="ts">
  let { component }: { component: { label: string } } = $props()
</script>

<output>{`discovered ${component.label}`}</output>
