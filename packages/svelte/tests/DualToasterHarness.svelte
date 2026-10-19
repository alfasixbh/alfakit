<script lang="ts">
  import { Toaster } from 'svelte-sonner'
  import { AlfakitToaster } from '../src/standalone'
</script>

<!-- A host layout with its own id-less toaster next to Alfakit's. -->
<Toaster />
<AlfakitToaster />
