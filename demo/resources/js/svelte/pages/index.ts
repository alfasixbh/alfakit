import FulfilmentBoard from './FulfilmentBoard.svelte'
import Pos from './Pos.svelte'

/** App pages of the panel (`Page::$component`), registered under the same names in React and Vue. */
export const panelPages = {
    'Pages/Pos': Pos,
    'Pages/FulfilmentBoard': FulfilmentBoard,
}
