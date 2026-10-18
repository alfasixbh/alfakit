<script lang="ts">
  import PageBlock from '../src/app/PageBlock.svelte'
  import PageForm from '../src/app/PageForm.svelte'
  import PageInfolist from '../src/app/PageInfolist.svelte'
</script>

<PageForm name="customer" />
<PageInfolist name="summary" />
<PageBlock name="table:products">
  {#snippet fallback()}<p>No products table</p>{/snippet}
</PageBlock>
