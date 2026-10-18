<script lang="ts">
  let { form }: { form: { action: string } } = $props()
</script>

<form aria-label="Contact" action={form.action}></form>
