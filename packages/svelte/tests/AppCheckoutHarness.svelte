<script lang="ts">
  import PageForm from '../src/app/PageForm.svelte'
  import { usePageForm, usePageMethod } from '../src/app/hooks.svelte'

  const checkout = usePageMethod<{ total: number }, { sku: string }>('checkout', {
    forms: ['customer'],
  })
  const form = usePageForm('customer')
</script>

<PageForm name="customer" />
<button onclick={() => void checkout.call({ sku: 'A-1' })}>Charge</button>
<p data-testid="loading">{String(checkout.loading)}</p>
<p data-testid="error">{checkout.errors.sku ?? ''}</p>
<p data-testid="result">{checkout.result?.total ?? ''}</p>
<p data-testid="email">{String(form.values.email ?? '')}</p>
