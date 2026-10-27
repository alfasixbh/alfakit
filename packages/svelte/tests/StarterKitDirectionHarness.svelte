<script lang="ts">
  import { useAlfakitDirection } from '../src/starter-kit'

  // What the installer adds to the kit's AppSidebar.
  const direction = useAlfakitDirection()
</script>

<aside data-testid="sidebar" data-side={direction.current === 'rtl' ? 'right' : 'left'}></aside>
