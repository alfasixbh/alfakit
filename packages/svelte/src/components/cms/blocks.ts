import type { AnyComponent } from '../../context.svelte'
import CallToActionBlock from './CallToActionBlock.svelte'
import ColumnsBlock from './ColumnsBlock.svelte'
import EmbedBlock from './EmbedBlock.svelte'
import FaqBlock from './FaqBlock.svelte'
import FeaturesBlock from './FeaturesBlock.svelte'
import FormBlock from './FormBlock.svelte'
import GalleryBlock from './GalleryBlock.svelte'
import HeroBlock from './HeroBlock.svelte'
import ImageBlock from './ImageBlock.svelte'
import RichTextBlock from './RichTextBlock.svelte'
import SectionBlock from './SectionBlock.svelte'
import TestimonialsBlock from './TestimonialsBlock.svelte'

/** The built-in block renderers, by type. Each gets `block` and `data` props. */
export const CMS_BLOCK_COMPONENTS: Record<string, AnyComponent> = {
  hero: HeroBlock,
  'rich-text': RichTextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  'call-to-action': CallToActionBlock,
  features: FeaturesBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  embed: EmbedBlock,
  columns: ColumnsBlock,
  form: FormBlock,
  section: SectionBlock,
}
