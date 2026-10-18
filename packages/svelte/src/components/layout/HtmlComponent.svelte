<script lang="ts">
  import type { HtmlSchema } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: HtmlSchema } = $props()
</script>

<div {...extraProps(component.extraAttributes, 'alfakit-prose text-sm')}>
  {@html component.content}
</div>
