<script setup lang="ts">
import { useId } from 'vue'
import { useT } from '../../context'
import Input from '../ui/Input.vue'
import Label from '../ui/Label.vue'

/** The current-password input of `requiresPasswordConfirmation()` actions. */
defineProps<{ error?: string }>()
const password = defineModel<string>({ default: '' })
const emit = defineEmits<{ submit: [] }>()
const t = useT()
const id = useId()
</script>

<template>
  <div data-slot="password-confirmation" class="flex flex-col gap-2">
    <Label :for="id">{{ t('current_password', {}, 'Current password') }}</Label>
    <Input
      :id="id"
      v-model="password"
      type="password"
      autocomplete="current-password"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : `${id}-hint`"
      @keydown.enter.prevent="emit('submit')"
    />
    <p v-if="error" :id="`${id}-error`" class="text-destructive text-sm">{{ error }}</p>
    <p v-else :id="`${id}-hint`" class="text-muted-foreground text-sm">
      {{ t('confirm_password', {}, 'Confirm your password to continue') }}
    </p>
  </div>
</template>
