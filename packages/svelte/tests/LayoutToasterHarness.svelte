<script lang="ts">
  import { Toaster } from 'svelte-sonner'
  import { AlfakitToaster } from '../src/standalone'
</script>

<!-- A host layout's own toaster, with Alfakit's turned off (`toaster={false}`). -->
<Toaster />
<AlfakitToaster toaster={false} />
