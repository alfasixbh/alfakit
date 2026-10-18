export * from '@alfakit/core'
export {
  AppPage,
  PageBlock,
  PageForm,
  PageInfolist,
  PageTable,
  PageWidgets,
  useAppPage,
  usePageBlock,
  type PageBlockProps,
} from './app/components'
export {
  useLiveProps,
  usePageForm,
  usePageMethod,
  usePageMethods,
  useReloadProps,
  useShortcut,
  type PageMethodBinding,
  type PageMethodMap,
  type PageMethodsBinding,
  type UsePageMethodOptions,
} from './app/hooks'
export {
  ActionButton,
  ActionGroupMenu,
  ActionList,
  ActionModals,
  PageActionProvider,
  usePageActionContext,
} from './components/actions'
export * from './components/ai'
export * from './components/analytics'
export * from './components/cms'
export * from './components/entries'
export * from './components/fields'
export * from './components/file-manager'
export { FormBlock } from './components/form/form-block'
export {
  FormProvider,
  useField,
  useFormState,
  useFormStore,
  useOptionalFormStore,
  type FieldBinding,
} from './components/form/form-context'
export * from './components/helpdesk'
export * from './components/kanban'
export * from './components/layout'
export * from './components/notifications'
export * from './components/panel'
export * from './components/realtime'
export { FieldWrapper } from './components/schema/field-wrapper'
export { RenderComponent, SchemaRenderer } from './components/schema/schema-renderer'
export * from './components/table'
export * from './components/translation-manager'
export * from './components/tree'
export { RecordVersionsComponent } from './components/versions/record-versions'
export * from './components/widgets'
export {
  AlfakitProvider,
  StandaloneProvider,
  useActionRunner,
  useAlfakit,
  useAlfakitProps,
  useChoice,
  useDirection,
  useFormatter,
  useLocalization,
  useOptionalAlfakit,
  usePageSchema,
  usePanel,
  usePollComponent,
  useRegistry,
  useStandalone,
  useT,
  type AlfakitContextValue,
  type AnyComponent,
  type StandaloneContextValue,
} from './context'
export { createAlfakit, type CreateAlfakitOptions } from './create-alfakit'
export { useHydrated } from './hooks/use-hydrated'
export { useIsMobile } from './hooks/use-mobile'
export { useStore, useStoreSelector } from './hooks/use-store'
export {
  useScrollToErroredItem,
  useVirtualList,
  type VirtualListBinding,
} from './hooks/use-virtual-list'
export { AppLayout } from './layouts/app-layout'
export { AuthLayout } from './layouts/auth-layout'
export { BlankLayout } from './layouts/blank-layout'
export { FullscreenLayout, type FullscreenLayoutProps } from './layouts/fullscreen-layout'
export { TopNavLayout } from './layouts/top-nav-layout'
export { extraProps, parseStyle } from './lib/attributes'
export * from './lib/colors'
export { discoverComponents, discoveredComponent, type DiscoveredComponents } from './lib/discovery'
export { Icon } from './lib/icons'
export { cn } from './lib/utils'
export { AlfakitPage, ContentBlockRenderer, PageContent, PageHeader, PageShell } from './pages/page'
export { createDefaultRegistry } from './registry'
export * from './standalone'
export * from './starter-kit'

// shadcn/ui primitives, so applications can build custom components in the same style.
export * from './components/ui/alert'
export * from './components/ui/avatar'
export * from './components/ui/badge'
export * from './components/ui/breadcrumb'
export * from './components/ui/button'
export * from './components/ui/calendar'
export * from './components/ui/card'
export * from './components/ui/checkbox'
export * from './components/ui/collapsible'
export * from './components/ui/command'
export * from './components/ui/dialog'
export * from './components/ui/dropdown-menu'
export * from './components/ui/input'
export * from './components/ui/label'
export * from './components/ui/popover'
export * from './components/ui/radio-group'
export * from './components/ui/scroll-area'
export * from './components/ui/select'
export * from './components/ui/separator'
export * from './components/ui/sheet'
export * from './components/ui/sidebar'
export * from './components/ui/skeleton'
export * from './components/ui/sonner'
export * from './components/ui/spinner'
export * from './components/ui/switch'
export * from './components/ui/table'
export * from './components/ui/tabs'
export * from './components/ui/textarea'
export * from './components/ui/tooltip'
