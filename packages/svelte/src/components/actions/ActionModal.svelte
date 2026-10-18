<script lang="ts">
  import type { OpenModal } from '@alfakit/core'
  import {
    actionFormComponent,
    actionFormParams,
    confirmModalClose,
    FormStore,
    guardModalUnload,
    isModalSubmitVisible,
    modalFooterAlignment,
    nestedActionContext,
    PASSWORD_CONFIRMATION_INPUT,
    scheduleAutofocus,
    slideOverSide,
    wizardProgressStore,
  } from '@alfakit/core'
  import { onDestroy, untrack } from 'svelte'
  import { useActionRunner, useDirection, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import {
    colorClass,
    iconBackgroundColorClasses,
    outlineButtonColorClasses,
    solidButtonColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import FormProvider from '../form/FormProvider.svelte'
  import Slot from '../panel/Slot.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'
  import { Label } from '../ui/label'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '../ui/dialog'
  import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
  } from '../ui/sheet'
  import { Spinner } from '../ui/spinner'
  import ActionList from './ActionList.svelte'
  import { showToast } from '../notifications/toast'

  const WIDTHS: Record<string, string> = {
    '3xs': 'sm:max-w-3xs',
    '2xs': 'sm:max-w-2xs',
    xs: 'sm:max-w-xs',
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    none: 'sm:max-w-none',
    min: 'sm:max-w-min',
    max: 'sm:max-w-max',
    fit: 'sm:max-w-fit',
    prose: 'sm:max-w-prose',
    container: 'sm:container',
    'screen-sm': 'sm:max-w-(--breakpoint-sm)',
    'screen-md': 'sm:max-w-(--breakpoint-md)',
    'screen-lg': 'sm:max-w-(--breakpoint-lg)',
    'screen-xl': 'sm:max-w-(--breakpoint-xl)',
    'screen-2xl': 'sm:max-w-(--breakpoint-2xl)',
    full: 'sm:max-w-[calc(100%-2rem)]',
    screen: 'sm:max-w-[calc(100%-2rem)] h-[calc(100%-2rem)]',
  }

  const FOOTER_JUSTIFY: Record<string, string> = {
    start: 'sm:justify-start',
    center: 'sm:justify-center',
    end: 'sm:justify-end',
    between: 'sm:justify-between',
  }

  let { modal, hidden = false }: { modal: OpenModal; hidden?: boolean } = $props()

  const runner = useActionRunner()
  const panel = usePanel()
  const direction = useDirection()
  const t = useT()
  const { action, context, modal: schema } = untrack(() => modal)

  const form = (() => {
    if (!schema.form) {
      return null
    }

    return new FormStore(schema.form, {
      token: context.token,
      component: actionFormComponent(action, context),
      record: context.record ?? null,
      refreshUrl: panel.endpoints.schemaRefresh,
      optionsUrl: panel.endpoints.schemaOptions,
      validateUrl: panel.endpoints.schemaValidate,
      // A halted wizard step shows what its hook sent.
      onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
      params: actionFormParams(context),
    })
  })()

  const formState = form ? useStore(form.store) : null

  $effect(() => {
    form?.setErrors(modal.errors)
  })

  onDestroy(() => form?.destroy())

  // Nested actions read this form (`$mountedActions`, `getRawData()`) and write into it
  // (`fillData()`).
  if (form) {
    onDestroy(runner.registerModalForm(action, context, form))
  }

  // `extraModalWindowAttributes()`: `class` joins the window's classes.
  const { class: windowClass, ...windowAttributes } = (schema.windowAttributes ?? {}) as Record<
    string,
    unknown
  >
  const footerAlignment = modalFooterAlignment(schema)
  const side = slideOverSide(schema.slideOverPosition, direction)
  // `modalClickThrough()`: no backdrop, no focus trap, the page keeps scrolling.
  const clickThrough = Boolean(schema.clickThrough)

  // The backdrop is the content's previous sibling: `extraModalOverlayAttributes()` land
  // on it, and `modalClickThrough()` removes it.
  let content = $state<HTMLElement | null>(null)

  $effect(() => {
    const overlay = content?.previousElementSibling

    if (hidden || !overlay?.getAttribute('data-slot')?.endsWith('-overlay')) return

    if (clickThrough) {
      overlay.remove()

      return
    }

    for (const [name, value] of Object.entries(schema.overlayAttributes ?? {})) {
      if (value === null || value === undefined || value === false) continue

      if (name === 'class') {
        overlay.classList.add(...String(value).split(/\s+/).filter(Boolean))
      } else {
        overlay.setAttribute(name, value === true ? '' : String(value))
      }
    }
  })

  // A wizard form reports its step, so the submit button waits for the last one.
  const progress = form ? useStore(wizardProgressStore(form)) : null
  const submitVisible = $derived(isModalSubmitVisible(schema, progress?.current))

  let password = $state('')
  const passwordId = $props.id()
  const passwordError = $derived(modal.errors[PASSWORD_CONFIRMATION_INPUT]?.[0])
  const footerContext = nestedActionContext(context, action)

  const run = (createAnother: boolean) => {
    const values = form?.state.values ?? {}
    const options = {
      ...(schema.passwordConfirmation ? { password } : {}),
      ...(createAnother ? { createAnother: true } : {}),
    }

    if (Object.keys(options).length > 0) {
      runner.execute(action, context, values, options)
    } else {
      runner.execute(action, context, values)
    }
  }
  const submit = () => run(false)
  // "Create & create another": the runner reloads the modal, and its fresh form fills this one.
  const submitAnother = () => run(true)

  let filledForm = untrack(() => modal.modal.form)
  $effect(() => {
    const payload = modal.modal.form

    if (payload && payload !== filledForm) {
      filledForm = payload
      form?.fill(payload)
    }
  })

  // "Create & create another": back to the `autofocus()` field of the fresh form.
  $effect(() => {
    const refocus = modal.refocus
    const components = untrack(() => modal.modal.form?.components)

    if (!refocus || !components) return

    return scheduleAutofocus(
      () => document.getElementById(`action-form-${action.name}`),
      components,
    )
  })
  // Dismissing the modal (not submitting it): `cancelParentActionsOnClose()` applies.
  const close = () => runner.cancelModal(action.name)
  const unsavedMessage = t('unsaved_changes_close', {}, 'You have unsaved changes. Close anyway?')
  // Cancel, Escape, clicking away and the close button ask first when the form changed.
  const requestClose = () => {
    if (confirmModalClose(schema, form, unsavedMessage)) close()
  }
  onDestroy(guardModalUnload(schema, form, unsavedMessage))
  const title = $derived(schema.heading ?? action.label ?? t('actions', {}, 'Actions'))

  const hasFooter = $derived(
    Boolean(schema.submitLabel || schema.cancelLabel || schema.extraFooterActions?.length),
  )
  const hasBody = $derived(
    Boolean(schema.content || form || schema.contentFooter || schema.passwordConfirmation),
  )

  const onOpenChange = (open: boolean) => {
    if (!open && !modal.processing) {
      requestClose()
    }
  }

  const onInteractOutside = (event: Event) => {
    if (!schema.closeByClickingAway) event.preventDefault()
  }

  const onEscapeKeydown = (event: KeyboardEvent) => {
    if (!schema.closeByEscaping) event.preventDefault()
  }

  function autofocus(node: HTMLElement, enabled: boolean) {
    if (enabled) {
      requestAnimationFrame(() => node.focus())
    }
  }
</script>

{#snippet header()}
  <div
    class={cn('flex gap-4', schema.alignment === 'center' && 'flex-col items-center text-center')}
  >
    {#if schema.icon}
      <div
        class={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          colorClass(iconBackgroundColorClasses, schema.iconColor, 'primary'),
        )}
      >
        <Icon name={schema.icon} class="size-5" />
      </div>
    {/if}
    <div class="flex flex-col gap-1.5">
      <!-- Every dialog needs an accessible name: without a heading it stays visually hidden. -->
      {#if schema.slideOver}<SheetTitle class={cn(!schema.heading && 'sr-only')}>{title}</SheetTitle
        >{:else}<DialogTitle class={cn(!schema.heading && 'sr-only')}>{title}</DialogTitle>{/if}
      {#if schema.description}
        {#if schema.slideOver}<SheetDescription>{@html schema.description}</SheetDescription
          >{:else}<DialogDescription>{@html schema.description}</DialogDescription>{/if}
      {:else if schema.slideOver}
        <SheetDescription class="sr-only">{title}</SheetDescription>
      {:else}
        <DialogDescription class="sr-only">{title}</DialogDescription>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet body()}
  <div class="flex flex-col gap-6">
    {#if schema.content}<SchemaRenderer components={schema.content} />{/if}
    {#if form && formState}
      <Slot name="modal.schema.before" data={{ action: action.name }} />
      <FormProvider store={form}>
        <form
          id={`action-form-${action.name}`}
          onsubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <SchemaRenderer
            components={formState.current.components}
            columns={formState.current.columns}
          />
        </form>
      </FormProvider>
      <Slot name="modal.schema.after" data={{ action: action.name }} />
    {/if}
    {#if schema.contentFooter}<SchemaRenderer components={schema.contentFooter} />{/if}
    {#if schema.passwordConfirmation}
      <div data-slot="password-confirmation" class="flex flex-col gap-2">
        <Label for={passwordId}>{t('current_password', {}, 'Current password')}</Label>
        <Input
          id={passwordId}
          type="password"
          autocomplete="current-password"
          bind:value={password}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? `${passwordId}-error` : `${passwordId}-hint`}
          onkeydown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
        {#if passwordError}
          <p id={`${passwordId}-error`} class="text-destructive text-sm">{passwordError}</p>
        {:else}
          <p id={`${passwordId}-hint`} class="text-muted-foreground text-sm">
            {t('confirm_password', {}, 'Confirm your password to continue')}
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet footer()}
  <div
    class={cn(
      'flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center',
      FOOTER_JUSTIFY[footerAlignment],
    )}
  >
    {#if schema.extraFooterActions}<ActionList
        actions={schema.extraFooterActions}
        context={footerContext}
        class={footerAlignment === 'end' ? 'sm:me-auto' : undefined}
      />{/if}
    {#if schema.cancelLabel}
      <Button
        type="button"
        variant="outline"
        class={schema.cancelColor ? colorClass(outlineButtonColorClasses, schema.cancelColor) : ''}
        onclick={requestClose}
        disabled={modal.processing}>{schema.cancelLabel}</Button
      >
    {/if}
    {#if schema.createAnotherLabel && schema.submitLabel && submitVisible}
      <Button
        type="button"
        variant="outline"
        data-slot="create-another"
        class={schema.createAnotherColor
          ? colorClass(outlineButtonColorClasses, schema.createAnotherColor)
          : ''}
        onclick={submitAnother}
        disabled={modal.processing}
        >{#if schema.createAnotherIcon}<Icon
            name={schema.createAnotherIcon}
          />{/if}{schema.createAnotherLabel}</Button
      >
    {/if}
    {#if schema.submitLabel && submitVisible}
      <Button
        type="button"
        class={colorClass(solidButtonColorClasses, schema.submitColor, 'primary')}
        onclick={submit}
        disabled={modal.processing}
      >
        {#if modal.processing}<Spinner />{:else if schema.submitIcon}<Icon
            name={schema.submitIcon}
          />{/if}
        {schema.submitLabel}
      </Button>
    {/if}
  </div>
{/snippet}

{#if schema.slideOver}
  <Sheet open={!hidden} {onOpenChange}>
    <SheetContent
      bind:ref={content}
      {...windowAttributes}
      {side}
      class={cn(
        'flex w-full flex-col gap-0 p-0',
        WIDTHS[schema.width] ?? 'sm:max-w-md',
        windowClass as string | undefined,
      )}
      trapFocus={!clickThrough}
      preventScroll={!clickThrough}
      showCloseButton={schema.closeButton}
      {onInteractOutside}
      {onEscapeKeydown}
    >
      <SheetHeader class="border-b">{@render header()}</SheetHeader>
      <div class="flex-1 overflow-y-auto p-4">{@render body()}</div>
      {#if hasFooter}
        <SheetFooter class={cn('border-t', schema.stickyFooter && 'bg-background sticky bottom-0')}
          >{@render footer()}</SheetFooter
        >
      {/if}
    </SheetContent>
  </Sheet>
{:else}
  <Dialog open={!hidden} {onOpenChange}>
    <DialogContent
      bind:ref={content}
      {...windowAttributes}
      class={cn(
        'max-h-[calc(100vh-2rem)] overflow-y-auto',
        WIDTHS[schema.width] ?? 'sm:max-w-lg',
        windowClass as string | undefined,
      )}
      trapFocus={!clickThrough}
      preventScroll={!clickThrough}
      showCloseButton={schema.closeButton}
      {onInteractOutside}
      {onEscapeKeydown}
    >
      <!-- A sticky header stays pinned to the top of the scrolling dialog, edge to edge. -->
      <DialogHeader
        class={cn(
          schema.stickyHeader &&
            'bg-background sticky -top-6 z-10 -mx-6 -mt-6 rounded-t-lg border-b px-6 pt-6 pb-4',
        )}>{@render header()}</DialogHeader
      >
      {#if hasBody}{@render body()}{/if}
      <!-- A sticky footer stays pinned to the bottom of the scrolling dialog, edge to edge. -->
      {#if hasFooter}<DialogFooter
          class={cn(
            schema.stickyFooter &&
              'bg-background sticky bottom-0 -mx-6 -mb-6 rounded-b-lg border-t px-6 py-4',
          )}>{@render footer()}</DialogFooter
        >{/if}
      <span class="sr-only" use:autofocus={schema.autofocus && !form}
        >{t('close', {}, 'Close')}</span
      >
    </DialogContent>
  </Dialog>
{/if}
