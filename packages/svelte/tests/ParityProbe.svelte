<script lang="ts">
  /** A registered test component: shows its `cta` prop or `component.props.total`. */
  let { cta, component }: { cta?: string; component?: { props?: { total?: number } } } = $props()
</script>

<p>{cta ?? `Total ${component?.props?.total}`}</p>
