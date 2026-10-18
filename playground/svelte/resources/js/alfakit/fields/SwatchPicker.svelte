<script lang="ts">
    import { FieldWrapper, cn, useField, useT } from '@alfakit/svelte'
    import type { SwatchPickerProps } from '../types'

    /**
     * App\Alfakit\Forms\Components\SwatchPicker. Auto-registered as `SwatchPicker` from this
     * file's path; `SwatchPickerProps` comes from `php artisan alfakit:types`.
     */
    let { component }: SwatchPickerProps = $props()

    const field = useField<string | null>(() => component)
    const t = useT()
    // App strings shared through Panel::frontendTranslations(['playground' => 'playground.frontend']).
    const selected = $derived(component.swatches.find((swatch) => swatch.value === field.value))
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
    <div
        id={field.id}
        role="radiogroup"
        aria-label={component.label}
        data-slot="swatch-picker"
        class="flex flex-wrap gap-2"
        {...field.aria}
    >
        {#each component.swatches as swatch (swatch.value)}
            <button
                type="button"
                role="radio"
                aria-checked={field.value === swatch.value}
                aria-label={swatch.label}
                title={swatch.label}
                disabled={field.disabled}
                onclick={() => field.setValue(swatch.value)}
                onblur={field.blur}
                class={cn(
                    'ring-offset-background focus-visible:ring-ring size-8 rounded-full border-2 border-transparent ring-offset-2 outline-none focus-visible:ring-2',
                    field.value === swatch.value && 'border-foreground',
                )}
                style:background-color={swatch.value}
            ></button>
        {/each}
    </div>
    <span class="sr-only" aria-live="polite">
        {selected
            ? t(
                  'playground.swatch_picker.selected',
                  { label: selected.label },
                  `Selected colour: ${selected.label}`,
              )
            : t('playground.swatch_picker.none', {}, 'No colour selected')}
    </span>
</FieldWrapper>
