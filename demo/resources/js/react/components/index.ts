import LatestReviews from './LatestReviews'
import PerfReadout from './PerfReadout'
import ScentPyramid from './ScentPyramid'
import SpendChart from './SpendChart'
import StockMeter from './StockMeter'

/** Custom panel components, registered on the client and the SSR server alike. */
export const components = {
    ScentPyramid,
    'demo-latest-reviews': LatestReviews,
    'demo-perf-readout': PerfReadout,
    'demo-spend-chart': SpendChart,
    'demo-stock-meter': StockMeter,
    // alfasix/alfakit-cms pages render inside the shop's layout, which has its own header and
    // footer (storefront/CmsPage).
    'cms:header': CmsNone,
    'cms:footer': CmsNone,
}

function CmsNone() {
    return null
}
