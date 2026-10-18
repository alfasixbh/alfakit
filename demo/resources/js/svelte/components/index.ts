import CmsNone from './CmsNone.svelte'
import LatestReviews from './LatestReviews.svelte'
import PerfReadout from './PerfReadout.svelte'
import ScentPyramid from './ScentPyramid.svelte'
import SpendChart from './SpendChart.svelte'
import StockMeter from './StockMeter.svelte'

/** Custom panel components, registered on the client and the SSR server alike. */
export const components = {
    ScentPyramid,
    'demo-latest-reviews': LatestReviews,
    'demo-perf-readout': PerfReadout,
    'demo-spend-chart': SpendChart,
    'demo-stock-meter': StockMeter,
    // alfasix/alfakit-cms pages use the storefront's own header and footer (storefront/CmsPage).
    'cms:header': CmsNone,
    'cms:footer': CmsNone,
}
