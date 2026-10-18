<script setup lang="ts">
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/vue';
import { Head } from '@inertiajs/vue3';
import Heading from '@/components/Heading.vue';

/**
 * An Alfakit form outside the admin panel: `ContactForm::make()` arrives as the `form`
 * prop and renders with the starter kit's own layout and shadcn tokens.
 */
defineProps<{ form: StandaloneComponentSchema }>();
</script>

<template>
    <Head title="Contact" />
    <div class="mx-auto w-full max-w-2xl p-6">
        <Heading
            title="Contact us"
            description="This form is an AlfaKit standalone component rendered in the app layout."
        />
        <AlfakitComponent :component="form" class="mt-6" />
    </div>
</template>
