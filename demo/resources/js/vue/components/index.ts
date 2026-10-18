import { defineComponent } from 'vue'
import LatestReviews from './LatestReviews.vue'
import PerfReadout from './PerfReadout.vue'
import ScentPyramid from './ScentPyramid.vue'
import SpendChart from './SpendChart.vue'
import StockMeter from './StockMeter.vue'

// alfasix/alfakit-cms pages use the storefront's own header and footer (storefront/CmsPage).
const CmsNone = defineComponent({ name: 'CmsNone', render: () => null })

/** Custom panel components, registered on the client and the SSR server alike. */
export const components = {
    ScentPyramid,
    'demo-latest-reviews': LatestReviews,
    'demo-perf-readout': PerfReadout,
    'demo-spend-chart': SpendChart,
    'demo-stock-meter': StockMeter,
    'cms:header': CmsNone,
    'cms:footer': CmsNone,
}
