<script lang="ts">
    import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/svelte';
    import AppHead from '@/components/AppHead.svelte';
    import Heading from '@/components/Heading.svelte';

    /**
     * An Alfakit form outside the admin panel: `ContactForm::make()` arrives as the `form`
     * prop and renders with the starter kit's own layout and shadcn tokens.
     */
    let { form }: { form: StandaloneComponentSchema } = $props();
</script>

<AppHead title="Contact" />

<div class="mx-auto w-full max-w-2xl p-6">
    <Heading
        title="Contact us"
        description="This form is an AlfaKit standalone component rendered in the app layout."
    />
    <AlfakitComponent component={form} class="mt-6" />
</div>
