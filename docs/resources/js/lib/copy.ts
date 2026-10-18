/**
 * Copy text to the clipboard. The async Clipboard API only exists on secure origins
 * (HTTPS or localhost), so on plain HTTP (Herd's *.test sites, for example) this falls
 * back to a selection plus `execCommand('copy')`. Resolves to whether the copy succeeded.
 */
export async function copyText(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // Fall through to the legacy path (denied permission, unfocused document…).
        }
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.insetInlineStart = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()

    let copied: boolean
    try {
        copied = document.execCommand('copy')
    } catch {
        copied = false
    }

    textarea.remove()

    return copied
}
