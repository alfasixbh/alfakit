<script lang="ts">
  let { component }: { component: { props: { label: string } } } = $props()
</script>

<p>rating {component.props.label}</p>
