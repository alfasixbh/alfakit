import type { FormState, OpenModal } from '@alfakit/core'
import {
  actionFormComponent,
  actionFormParams,
  actionPath,
  confirmModalClose,
  formIdPrefix,
  FormStore,
  guardModalUnload,
  isModalHiddenByChild,
  isModalSubmitVisible,
  modalFooterAlignment,
  nestedActionContext,
  PASSWORD_CONFIRMATION_INPUT,
  scheduleAutofocus,
  slideOverSide,
  wizardProgressStore,
} from '@alfakit/core'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useActionRunner, useDirection, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import {
  colorClass,
  iconBackgroundColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { FormProvider } from '../form/form-context'
import { showToast } from '../notifications/flash-toasts'
import { Slot } from '../panel/slot'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet'
import { Spinner } from '../ui/spinner'
import { ActionList } from './action-list'

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

// Module-level so the snapshot stays stable (a new object per read re-renders forever).
const EMPTY_PROGRESS = { step: 0, count: 0 }
const NO_PROGRESS = { get: () => EMPTY_PROGRESS, subscribe: () => () => {} }
const NO_FORM = { get: () => null, subscribe: () => () => {} }

/** Renders every open action modal from the runner store. Mount once per app. */
export function ActionModals() {
  const runner = useActionRunner()
  const { modals } = useStore(runner.store)

  // Notifications from JSON responses (a modal `mountUsing()` cancelled, field actions).
  useEffect(() => {
    runner.setNotificationHandler((notifications) => notifications.forEach((n) => showToast(n)))

    return () => runner.setNotificationHandler(undefined)
  }, [runner])

  return (
    <>
      {modals.map((modal, index) => (
        <ActionModal
          key={`${actionPath(modal.action, modal.context)}-${modal.context.record ?? ''}`}
          modal={modal}
          hidden={isModalHiddenByChild(modals, index)}
        />
      ))}
    </>
  )
}

const FOOTER_JUSTIFY: Record<string, string> = {
  start: 'sm:justify-start',
  center: 'sm:justify-center',
  end: 'sm:justify-end',
  between: 'sm:justify-between',
}

/**
 * Put PHP attributes (`extraModalOverlayAttributes()`) on an element the renderer doesn't
 * create itself (the dialog's backdrop). `class` is added to the element's classes.
 */
function applyAttributes(
  element: Element | null | undefined,
  attributes: Record<string, unknown> | undefined,
) {
  if (!element || !attributes) return

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue

    if (name === 'class' || name === 'className') {
      element.classList.add(...String(value).split(/\s+/).filter(Boolean))
    } else {
      element.setAttribute(name, value === true ? '' : String(value))
    }
  }
}

function ActionModal({ modal, hidden = false }: { modal: OpenModal; hidden?: boolean }) {
  const runner = useActionRunner()
  const panel = usePanel()
  const direction = useDirection()
  const t = useT()
  const { action, context, modal: schema } = modal
  const submittedRef = useRef(false)

  const form = useMemo(() => {
    if (!schema.form) {
      return null
    }

    return new FormStore(schema.form, {
      token: context.token,
      component: actionFormComponent(action, context),
      // Own field ids: the modal opens over a form whose fields may share names.
      idPrefix: formIdPrefix(actionFormComponent(action, context)),
      record: context.record ?? null,
      refreshUrl: panel.endpoints.schemaRefresh,
      optionsUrl: panel.endpoints.schemaOptions,
      validateUrl: panel.endpoints.schemaValidate,
      // A halted wizard step shows what its hook sent.
      onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
      params: actionFormParams(context),
    })
  }, [schema.form, context, action, panel.endpoints])

  useEffect(() => {
    form?.setErrors(modal.errors)
  }, [form, modal.errors])

  useEffect(() => () => form?.destroy(), [form])

  // "Create & create another": back to the `autofocus()` field of the fresh form.
  const refocus = modal.refocus

  useEffect(() => {
    if (!refocus || !form) return

    return scheduleAutofocus(
      () => document.getElementById(`action-form-${action.name}`),
      form.state.components,
    )
  }, [refocus, form, action.name])

  // Nested actions read this form (`$mountedActions`, `getRawData()`) and write into it
  // (`fillData()`).
  useEffect(
    () => (form ? runner.registerModalForm(action, context, form) : undefined),
    [runner, form, action, context],
  )

  // `extraModalOverlayAttributes()`: the backdrop is the content's previous sibling.
  // A callback ref: the portal renders the content after the first commit.
  const [content, setContent] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (hidden) return

    const overlay = content?.previousElementSibling

    if (overlay?.getAttribute('data-slot')?.endsWith('-overlay')) {
      applyAttributes(overlay, schema.overlayAttributes)
    }
  }, [schema.overlayAttributes, hidden, content])

  // Live updates replace the form's components (fields shown, options changed).
  const formState = useStore<FormState | null>(form?.store ?? NO_FORM)

  // A wizard form reports its step, so the submit button waits for the last one.
  const progressStore = useMemo(() => (form ? wizardProgressStore(form) : null), [form])
  const progress = useStore(progressStore ?? NO_PROGRESS)
  const submitVisible = isModalSubmitVisible(schema, progressStore ? progress : null)

  const [password, setPassword] = useState('')
  const passwordId = useId()
  const passwordError = modal.errors[PASSWORD_CONFIRMATION_INPUT]?.[0]

  const submit = (createAnother = false) => {
    submittedRef.current = true
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

  const footerContext = useMemo(() => nestedActionContext(context, action), [context, action])

  // Dismissing the modal (not submitting it): `cancelParentActionsOnClose()` applies.
  const close = () => runner.cancelModal(action.name)
  const unsavedMessage = t('unsaved_changes_close', {}, 'You have unsaved changes. Close anyway?')
  // Cancel, Escape, clicking away and the close button ask first when the form changed.
  const requestClose = () => {
    if (confirmModalClose(schema, form, unsavedMessage)) close()
  }

  useEffect(() => guardModalUnload(schema, form, unsavedMessage), [schema, form, unsavedMessage])
  const title = schema.heading ?? action.label ?? t('actions', {}, 'Actions')

  const header = (
    <div
      className={cn(
        'flex gap-4',
        schema.alignment === 'center' && 'flex-col items-center text-center',
      )}
    >
      {schema.icon && (
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            colorClass(iconBackgroundColorClasses, schema.iconColor, 'primary'),
          )}
        >
          <Icon name={schema.icon} className="size-5" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {/* Every dialog needs an accessible name: without a heading it stays visually hidden. */}
        {schema.slideOver ? (
          <SheetTitle className={cn(!schema.heading && 'sr-only')}>{title}</SheetTitle>
        ) : (
          <DialogTitle className={cn(!schema.heading && 'sr-only')}>{title}</DialogTitle>
        )}
        {schema.description ? (
          schema.slideOver ? (
            <SheetDescription dangerouslySetInnerHTML={{ __html: schema.description }} />
          ) : (
            <DialogDescription dangerouslySetInnerHTML={{ __html: schema.description }} />
          )
        ) : schema.slideOver ? (
          <SheetDescription className="sr-only">{title}</SheetDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
      </div>
    </div>
  )

  const body = (
    <div className="flex flex-col gap-6">
      {schema.content && <SchemaRenderer components={schema.content} />}
      {form && <Slot name="modal.schema.before" data={{ action: action.name }} />}
      {form && (
        <FormProvider store={form}>
          <form
            id={`action-form-${action.name}`}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <SchemaRenderer
              components={formState?.components ?? form.state.components}
              columns={formState?.columns ?? form.state.columns}
            />
          </form>
        </FormProvider>
      )}
      {form && <Slot name="modal.schema.after" data={{ action: action.name }} />}
      {schema.contentFooter && <SchemaRenderer components={schema.contentFooter} />}
      {schema.passwordConfirmation && (
        <div data-slot="password-confirmation" className="flex flex-col gap-2">
          <Label htmlFor={passwordId}>{t('current_password', {}, 'Current password')}</Label>
          <Input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? `${passwordId}-error` : `${passwordId}-hint`}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
          {passwordError ? (
            <p id={`${passwordId}-error`} className="text-destructive text-sm">
              {passwordError}
            </p>
          ) : (
            <p id={`${passwordId}-hint`} className="text-muted-foreground text-sm">
              {t('confirm_password', {}, 'Confirm your password to continue')}
            </p>
          )}
        </div>
      )}
    </div>
  )

  const footerAlignment = modalFooterAlignment(schema)
  const footer = (schema.submitLabel ||
    schema.cancelLabel ||
    schema.extraFooterActions?.length) && (
    <div
      className={cn(
        'flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center',
        FOOTER_JUSTIFY[footerAlignment],
      )}
    >
      {schema.extraFooterActions && (
        <ActionList
          actions={schema.extraFooterActions}
          context={footerContext}
          className={footerAlignment === 'end' ? 'sm:me-auto' : undefined}
        />
      )}
      {schema.cancelLabel && (
        <Button
          type="button"
          variant="outline"
          className={
            schema.cancelColor
              ? colorClass(outlineButtonColorClasses, schema.cancelColor)
              : undefined
          }
          onClick={requestClose}
          disabled={modal.processing}
        >
          {schema.cancelLabel}
        </Button>
      )}
      {schema.createAnotherLabel && schema.submitLabel && submitVisible && (
        <Button
          type="button"
          variant="outline"
          data-slot="create-another"
          className={
            schema.createAnotherColor
              ? colorClass(outlineButtonColorClasses, schema.createAnotherColor)
              : undefined
          }
          onClick={() => submit(true)}
          disabled={modal.processing}
        >
          {schema.createAnotherIcon && <Icon name={schema.createAnotherIcon} />}
          {schema.createAnotherLabel}
        </Button>
      )}
      {schema.submitLabel && submitVisible && (
        <Button
          type="button"
          className={colorClass(solidButtonColorClasses, schema.submitColor, 'primary')}
          onClick={() => submit()}
          disabled={modal.processing}
          autoFocus={schema.autofocus && !form}
        >
          {modal.processing ? <Spinner /> : schema.submitIcon && <Icon name={schema.submitIcon} />}
          {schema.submitLabel}
        </Button>
      )}
    </div>
  )

  const onOpenChange = (open: boolean) => {
    if (!open && !modal.processing) {
      requestClose()
    }
  }

  // `modalClickThrough()`: a non-modal dialog has no backdrop and leaves the page usable.
  const isModal = !schema.clickThrough

  if (schema.slideOver) {
    return (
      <Sheet open={!hidden} modal={isModal} onOpenChange={onOpenChange}>
        <SheetContent
          ref={setContent}
          side={slideOverSide(schema.slideOverPosition, direction)}
          {...extraProps(
            schema.windowAttributes,
            cn('flex w-full flex-col gap-0 p-0', WIDTHS[schema.width] ?? 'sm:max-w-md'),
          )}
          showCloseButton={schema.closeButton}
          onInteractOutside={(event) => !schema.closeByClickingAway && event.preventDefault()}
          onEscapeKeyDown={(event) => !schema.closeByEscaping && event.preventDefault()}
        >
          <SheetHeader className="border-b">{header}</SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">{body}</div>
          {footer && (
            <SheetFooter
              className={cn('border-t', schema.stickyFooter && 'bg-background sticky bottom-0')}
            >
              {footer}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={!hidden} modal={isModal} onOpenChange={onOpenChange}>
      <DialogContent
        ref={setContent}
        {...extraProps(
          schema.windowAttributes,
          cn('max-h-[calc(100vh-2rem)] overflow-y-auto', WIDTHS[schema.width] ?? 'sm:max-w-lg'),
        )}
        showCloseButton={schema.closeButton}
        onInteractOutside={(event) => !schema.closeByClickingAway && event.preventDefault()}
        onEscapeKeyDown={(event) => !schema.closeByEscaping && event.preventDefault()}
      >
        <DialogHeader
          className={cn(
            // Pinned to the top of the scrolling dialog, edge to edge.
            schema.stickyHeader &&
              'bg-background sticky -top-6 z-10 -mx-6 -mt-6 rounded-t-lg border-b px-6 pt-6 pb-4',
          )}
        >
          {header}
        </DialogHeader>
        {(schema.content || form || schema.contentFooter || schema.passwordConfirmation) && body}
        {footer && (
          <DialogFooter
            className={cn(
              // Pinned to the bottom of the scrolling dialog, edge to edge.
              schema.stickyFooter &&
                'bg-background sticky bottom-0 -mx-6 -mb-6 rounded-b-lg border-t px-6 py-4',
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
