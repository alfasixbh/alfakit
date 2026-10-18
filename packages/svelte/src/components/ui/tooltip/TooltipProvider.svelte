<script lang="ts">
  import { Tooltip as Primitive } from 'bits-ui'

  let { ...rest }: Primitive.ProviderProps = $props()
</script>

<Primitive.Provider {...rest} />
