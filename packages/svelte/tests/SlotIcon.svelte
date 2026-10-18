<script lang="ts">
  let { name, class: className }: { name: string; class?: string } = $props()
</script>

<i data-icon={name} class={className}></i>
