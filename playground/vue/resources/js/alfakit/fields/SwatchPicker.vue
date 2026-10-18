<script setup lang="ts">
import { computed } from 'vue'
import { FieldWrapper, cn, useField, useT } from '@alfakit/vue'
import type { SwatchPickerSchema } from '../types'

/**
 * App\Alfakit\Forms\Components\SwatchPicker. Auto-registered as `SwatchPicker` from this
 * file's path; `SwatchPickerSchema` comes from `php artisan alfakit:types`.
 */
const props = defineProps<{ component: SwatchPickerSchema }>()
const { value, setValue, blur, error, id, disabled, aria } = useField<string | null>(
    () => props.component,
)
const t = useT()
// App strings shared through Panel::frontendTranslations(['playground' => 'playground.frontend']).
const selected = computed(() =>
    props.component.swatches.find((swatch) => swatch.value === value.value),
)
</script>

<template>
    <FieldWrapper :field="props.component" :html-for="id" :error="error">
        <div
            :id="id"
            role="radiogroup"
            :aria-label="props.component.label"
            data-slot="swatch-picker"
            class="flex flex-wrap gap-2"
            v-bind="aria"
        >
            <button
                v-for="swatch in props.component.swatches"
                :key="swatch.value"
                type="button"
                role="radio"
                :aria-checked="value === swatch.value"
                :aria-label="swatch.label"
                :title="swatch.label"
                :disabled="disabled"
                :class="
                    cn(
                        'ring-offset-background focus-visible:ring-ring size-8 rounded-full border-2 border-transparent ring-offset-2 outline-none focus-visible:ring-2',
                        value === swatch.value && 'border-foreground',
                    )
                "
                :style="{ backgroundColor: swatch.value }"
                @click="setValue(swatch.value)"
                @blur="blur"
            />
        </div>
        <span class="sr-only" aria-live="polite">
            {{
                selected
                    ? t(
                          'playground.swatch_picker.selected',
                          { label: selected.label },
                          `Selected colour: ${selected.label}`,
                      )
                    : t('playground.swatch_picker.none', {}, 'No colour selected')
            }}
        </span>
    </FieldWrapper>
</template>
