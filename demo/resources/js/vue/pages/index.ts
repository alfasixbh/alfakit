import FulfilmentBoard from './FulfilmentBoard.vue'
import Pos from './Pos.vue'

/** App pages of the panel (`Page::$component`), registered under the same names in React and Svelte. */
export const panelPages = {
    'Pages/Pos': Pos,
    'Pages/FulfilmentBoard': FulfilmentBoard,
}
