<script lang="ts">
  import AuthLayout from '../src/layouts/AuthLayout.svelte'
  import { provideAlfakit } from '../src/context.svelte'
  import { context } from './mocks'

  provideAlfakit(context)
</script>

<AuthLayout heading="Sign in"><p>Form</p></AuthLayout>
