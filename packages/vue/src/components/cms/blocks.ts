import type { AnyComponent } from '../../context'
import CallToActionBlock from './CallToActionBlock.vue'
import ColumnsBlock from './ColumnsBlock.vue'
import EmbedBlock from './EmbedBlock.vue'
import FaqBlock from './FaqBlock.vue'
import FeaturesBlock from './FeaturesBlock.vue'
import FormBlock from './FormBlock.vue'
import GalleryBlock from './GalleryBlock.vue'
import HeroBlock from './HeroBlock.vue'
import ImageBlock from './ImageBlock.vue'
import RichTextBlock from './RichTextBlock.vue'
import SectionBlock from './SectionBlock.vue'
import TestimonialsBlock from './TestimonialsBlock.vue'

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
