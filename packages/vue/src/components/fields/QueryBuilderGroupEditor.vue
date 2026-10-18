<script setup lang="ts">
import type { QueryBuilderConstraintSchema, QueryBuilderGroup, RulePath } from '@alfakit/core'
import {
  addGroup,
  addRule,
  canNestGroup,
  constraintPickerSections,
  createRule,
  removeRule,
  setCombinator,
} from '@alfakit/core'
import { PlusIcon, XIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuGroup from '../ui/DropdownMenuGroup.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import QueryBuilderRuleEditor from './QueryBuilderRuleEditor.vue'

defineOptions({ name: 'QueryBuilderGroupEditor' })

const props = defineProps<{
  group: QueryBuilderGroup
  path: RulePath
  tree: QueryBuilderGroup
  constraints: QueryBuilderConstraintSchema[]
  maxDepth: number
  locked: boolean
  /** Grid and width classes of the "add rule" picker (`constraintPickerColumns()` / `…Width()`). */
  picker?: { grid?: string; width?: string }
}>()
const emit = defineEmits<{ change: [tree: QueryBuilderGroup] }>()
const t = useT()
const sections = computed(() => constraintPickerSections(props.constraints))
const grouped = computed(() => sections.value.some((section) => section.label))
const pick = (constraint: QueryBuilderConstraintSchema) =>
  emit('change', addRule(props.tree, props.path, createRule(constraint)))
const combinators = ['and', 'or'] as const
</script>

<template>
  <div data-slot="query-builder-group" class="flex flex-col gap-2">
    <div v-if="props.group.rules.length > 1" class="flex items-center gap-2 text-xs">
      <span class="text-muted-foreground">{{
        t('query_builder.combinator', {}, 'Combine rules with')
      }}</span>
      <div class="inline-flex rounded-md border p-0.5">
        <button
          v-for="combinator in combinators"
          :key="combinator"
          type="button"
          :disabled="props.locked"
          :aria-pressed="props.group.combinator === combinator"
          :class="
            cn(
              'rounded-sm px-2 py-0.5 font-medium uppercase',
              props.group.combinator === combinator
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
          @click="emit('change', setCombinator(props.tree, props.path, combinator))"
        >
          {{ t(`query_builder.${combinator}`, {}, combinator) }}
        </button>
      </div>
    </div>
    <p v-if="props.group.rules.length === 0" class="text-muted-foreground text-sm">
      {{ t('query_builder.empty', {}, 'No rules yet.') }}
    </p>
    <template v-for="(rule, index) in props.group.rules" :key="index">
      <div
        v-if="rule.type === 'group'"
        class="bg-muted/30 flex items-start gap-2 rounded-md border border-s-2 p-2"
      >
        <div class="min-w-0 flex-1">
          <QueryBuilderGroupEditor
            :group="rule"
            :path="[...props.path, index]"
            :tree="props.tree"
            :constraints="props.constraints"
            :max-depth="props.maxDepth"
            :picker="props.picker"
            :locked="props.locked"
            @change="emit('change', $event)"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          :disabled="props.locked"
          :aria-label="t('query_builder.remove_group', {}, 'Remove group')"
          @click="emit('change', removeRule(props.tree, [...props.path, index]))"
        >
          <XIcon />
        </Button>
      </div>
      <QueryBuilderRuleEditor
        v-else
        :rule="rule"
        :path="[...props.path, index]"
        :tree="props.tree"
        :constraints="props.constraints"
        :locked="props.locked"
        @change="emit('change', $event)"
      />
    </template>
    <div class="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="props.locked || props.constraints.length === 0"
          >
            <PlusIcon /> {{ t('query_builder.add_rule', {}, 'Add rule') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" :class="props.picker?.width">
          <div
            data-slot="query-builder-constraint-picker"
            :class="grouped ? undefined : props.picker?.grid"
          >
            <!-- `constraints(['Group' => [...]])`: a labelled section per group. -->
            <template v-if="grouped">
              <template v-for="section in sections" :key="section.label ?? ''">
                <DropdownMenuGroup
                  v-if="section.label"
                  :aria-label="section.label"
                  data-slot="query-builder-constraint-group"
                >
                  <DropdownMenuLabel class="text-muted-foreground text-xs">
                    {{ section.label }}
                  </DropdownMenuLabel>
                  <div :class="props.picker?.grid">
                    <DropdownMenuItem
                      v-for="constraint in section.constraints"
                      :key="constraint.name"
                      @select="pick(constraint)"
                    >
                      <Icon v-if="constraint.icon" :name="constraint.icon" />
                      {{ constraint.label }}
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuGroup>
                <div v-else :class="props.picker?.grid">
                  <DropdownMenuItem
                    v-for="constraint in section.constraints"
                    :key="constraint.name"
                    @select="pick(constraint)"
                  >
                    <Icon v-if="constraint.icon" :name="constraint.icon" />
                    {{ constraint.label }}
                  </DropdownMenuItem>
                </div>
              </template>
            </template>
            <template v-else>
              <DropdownMenuItem
                v-for="constraint in props.constraints"
                :key="constraint.name"
                @select="pick(constraint)"
              >
                <Icon v-if="constraint.icon" :name="constraint.icon" />
                {{ constraint.label }}
              </DropdownMenuItem>
            </template>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        v-if="canNestGroup(props.path, props.maxDepth) && props.constraints[0]"
        type="button"
        variant="ghost"
        size="sm"
        :disabled="props.locked"
        @click="emit('change', addGroup(props.tree, props.path, createRule(props.constraints[0]!)))"
      >
        <PlusIcon /> {{ t('query_builder.add_group', {}, 'Add group') }}
      </Button>
    </div>
  </div>
</template>
