<script lang="ts">
  let { data }: { data: { plan: string } } = $props()
</script>

<p data-testid="pricing">Plan: {data.plan}</p>
