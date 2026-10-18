<script lang="ts">
  let { data }: { data: { name: string } } = $props()
</script>

<strong>Hero {data.name}</strong>
