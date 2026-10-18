import { copyText } from '@/lib/copy'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import php from 'highlight.js/lib/languages/php'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('php', php)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('js', typescript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('vue', xml)
hljs.registerLanguage('svelte', xml)
hljs.registerLanguage('html', xml)

const COPY_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>'
const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

/** Adds a "Copy" button to every code block under `root` (once per block). */
export function addCopyButtons(root: HTMLElement): void {
    root.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
        const code = pre.querySelector('code')
        if (!code || pre.dataset.copy) return
        pre.dataset.copy = 'yes'

        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'copy-button'
        button.setAttribute('aria-label', 'Copy code')
        button.innerHTML = `${COPY_ICON}<span>Copy</span>`

        let timer: number | undefined
        button.addEventListener('click', async () => {
            if (!(await copyText(code.innerText))) {
                // Nothing worked: select the code so it can be copied by hand.
                const range = document.createRange()
                range.selectNodeContents(code)
                window.getSelection()?.removeAllRanges()
                window.getSelection()?.addRange(range)
                return
            }

            button.innerHTML = `${CHECK_ICON}<span>Copied</span>`
            button.classList.add('is-copied')
            window.clearTimeout(timer)
            timer = window.setTimeout(() => {
                button.innerHTML = `${COPY_ICON}<span>Copy</span>`
                button.classList.remove('is-copied')
            }, 1500)
        })

        pre.appendChild(button)
    })
}

export function highlightCodeBlocks(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
        if (block.dataset.highlighted) return
        hljs.highlightElement(block)
        block.dataset.highlighted = 'yes'
    })

    addCopyButtons(root)
}

/** Highlighted HTML for a snippet, for rendering on the server and in the browser alike. */
export function highlight(code: string, language: string): string {
    return hljs.highlight(code, { language }).value
}
