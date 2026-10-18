<script lang="ts">
  let { component }: { component: { label: string } } = $props()
</script>

<p>wheel {component.label}</p>
