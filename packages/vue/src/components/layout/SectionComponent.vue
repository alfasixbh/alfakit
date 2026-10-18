<script setup lang="ts">
import type { SectionSchema } from '@alfakit/core'
import {
  actionsAlignmentClass,
  headingTag,
  readPersisted,
  schemaGapClass,
  writePersisted,
} from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import ActionList from '../actions/ActionList.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'
import Collapsible from '../ui/Collapsible.vue'
import CollapsibleContent from '../ui/CollapsibleContent.vue'
import CollapsibleTrigger from '../ui/CollapsibleTrigger.vue'
import { useT } from '../../context'
import DeferredSchema from './DeferredSchema.vue'
import MixedContent from './MixedContent.vue'

const props = defineProps<{ component: SectionSchema }>()
const open = ref(!props.component.collapsed)
// Inside a form the section's actions run as field actions, so `$get` / `$set` work.
const sectionForm = useOptionalFormStore()
const pageContext = usePageActionContext()
const fieldContext = useFieldActionContext(() => props.component)
const context = computed(() => (sectionForm ? fieldContext.value : pageContext))
const heading = computed(() => headingTag(props.component.headingLevel))
const hasHeader = computed(() =>
  Boolean(
    props.component.heading ||
    props.component.description ||
    props.component.icon ||
    props.component.headerActions?.length ||
    props.component.afterHeader?.length,
  ),
)

// Stored after mounting, so the server render and hydration use the schema's default.
onMounted(() => {
  const key = props.component.persistCollapsed

  if (!key) return

  const stored = readPersisted(key)

  if (stored !== null) open.value = stored !== 'collapsed'
})

function setOpen(next: boolean) {
  open.value = next

  if (props.component.persistCollapsed) {
    writePersisted(props.component.persistCollapsed, next ? 'expanded' : 'collapsed')
  }
}
const hasFooterActions = computed(() => Boolean(props.component.footerActions?.length))
const hasFooter = computed(() => hasFooterActions.value || Boolean(props.component.footer?.length))
const t = useT()
</script>

<template>
  <Collapsible
    v-if="props.component.aside"
    :open="!props.component.collapsible || open"
    as-child
    @update:open="setOpen($event)"
  >
    <section
      data-slot="section"
      class="grid gap-6 lg:grid-cols-3"
      v-bind="props.component.extraAttributes"
    >
      <div v-if="hasHeader" class="flex flex-wrap items-start gap-3 lg:col-span-1">
        <Icon
          v-if="props.component.icon"
          :name="props.component.icon"
          class="text-muted-foreground mt-0.5 size-5"
        />
        <div class="min-w-0 flex-1 basis-48">
          <component
            :is="heading"
            v-if="props.component.heading"
            class="text-base leading-6 font-semibold"
          >
            {{ props.component.heading }}
          </component>
          <p v-if="props.component.description" class="text-muted-foreground mt-1 text-sm">
            {{ props.component.description }}
          </p>
        </div>
        <ActionList
          v-if="props.component.headerActions && props.component.headerActions.length > 0"
          :actions="props.component.headerActions"
          :context="context"
          size="sm"
        />
        <MixedContent :items="props.component.afterHeader" name="section-after-header" />
        <CollapsibleTrigger v-if="props.component.collapsible" as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('toggle_section', {}, 'Toggle section')"
          >
            <Icon
              name="alfakit::schemas.section.collapse-button"
              :fallback="ChevronDownIcon"
              :class="cn('transition-transform', open && 'rotate-180')"
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent as-child>
        <div
          data-surface="section"
          :class="
            cn(
              'bg-card rounded-xl border shadow-xs lg:col-span-2',
              props.component.secondary && 'bg-muted/40',
            )
          "
        >
          <div :class="cn('p-6', props.component.compact && 'p-4')">
            <DeferredSchema v-slot="{ component: loaded }" :component="props.component">
              <SchemaRenderer
                :components="loaded.schema ?? []"
                :columns="loaded.columns"
                :class="schemaGapClass(loaded) || undefined"
              />
            </DeferredSchema>
          </div>
          <div
            v-if="hasFooter"
            data-slot="section-footer"
            :class="
              cn(
                'flex flex-wrap items-center gap-3 border-t px-6 py-4',
                props.component.compact && 'px-4 py-3',
              )
            "
          >
            <ActionList
              v-if="hasFooterActions"
              :actions="props.component.footerActions!"
              :context="context"
              :class="actionsAlignmentClass(props.component.footerActionsAlignment) || undefined"
            />
            <MixedContent :items="props.component.footer" name="section-footer-content" />
          </div>
        </div>
      </CollapsibleContent>
    </section>
  </Collapsible>
  <Collapsible
    v-else
    :open="!props.component.collapsible || open"
    as-child
    @update:open="setOpen($event)"
  >
    <section
      data-slot="section"
      data-surface="section"
      :class="cn('bg-card rounded-xl border shadow-xs', props.component.secondary && 'bg-muted/40')"
      v-bind="props.component.extraAttributes"
    >
      <div
        v-if="hasHeader"
        :class="
          cn(
            'flex flex-wrap items-start gap-3 border-b px-6 py-4',
            props.component.compact && 'px-4 py-3',
          )
        "
      >
        <Icon
          v-if="props.component.icon"
          :name="props.component.icon"
          class="text-muted-foreground mt-0.5 size-5"
        />
        <div class="min-w-0 flex-1 basis-48">
          <component
            :is="heading"
            v-if="props.component.heading"
            class="text-base leading-6 font-semibold"
          >
            {{ props.component.heading }}
          </component>
          <p v-if="props.component.description" class="text-muted-foreground mt-1 text-sm">
            {{ props.component.description }}
          </p>
        </div>
        <ActionList
          v-if="props.component.headerActions && props.component.headerActions.length > 0"
          :actions="props.component.headerActions"
          :context="context"
          size="sm"
        />
        <MixedContent :items="props.component.afterHeader" name="section-after-header" />
        <CollapsibleTrigger v-if="props.component.collapsible" as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('toggle_section', {}, 'Toggle section')"
          >
            <Icon
              name="alfakit::schemas.section.collapse-button"
              :fallback="ChevronDownIcon"
              :class="cn('transition-transform', open && 'rotate-180')"
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div :class="cn('p-6', props.component.compact && 'p-4')">
          <DeferredSchema v-slot="{ component: loaded }" :component="props.component">
            <SchemaRenderer
              :components="loaded.schema ?? []"
              :columns="loaded.columns"
              :class="schemaGapClass(loaded) || undefined"
            />
          </DeferredSchema>
        </div>
        <div
          v-if="hasFooter"
          data-slot="section-footer"
          :class="
            cn(
              'flex flex-wrap items-center gap-3 border-t px-6 py-4',
              props.component.compact && 'px-4 py-3',
            )
          "
        >
          <ActionList
            v-if="hasFooterActions"
            :actions="props.component.footerActions!"
            :context="context"
            :class="actionsAlignmentClass(props.component.footerActionsAlignment) || undefined"
          />
          <MixedContent :items="props.component.footer" name="section-footer-content" />
        </div>
      </CollapsibleContent>
    </section>
  </Collapsible>
</template>
