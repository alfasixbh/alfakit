import FulfilmentBoard from './FulfilmentBoard'
import Pos from './Pos'

/** App pages of the panel (`Page::$component`), registered under the same names in Vue and Svelte. */
export const panelPages = {
    'Pages/Pos': Pos,
    'Pages/FulfilmentBoard': FulfilmentBoard,
}
