/**
 * Rich editor image attachments. While editing, an uploaded image is shown from a local
 * object URL, but the field state references it by the `tmp:` key the upload endpoint
 * returned; the server moves the file to permanent storage on save and rewrites the `src`
 * to the stored URL. This keeps the two spellings in sync.
 */
export class EditorAttachments {
  private readonly urlsByKey = new Map<string, string>()

  /** Remember an uploaded file and return the URL to display it with. */
  add(key: string, file: Blob): string {
    const existing = this.urlsByKey.get(key)

    if (existing) {
      return existing
    }

    const url = URL.createObjectURL(file)
    this.urlsByKey.set(key, url)

    return url
  }

  /** Editor output → field state: local preview URLs become `tmp:` keys. */
  toState(content: string): string {
    let result = content

    for (const [key, url] of this.urlsByKey) {
      result = result.split(url).join(key)
    }

    return result
  }

  /** Field state → editor content: `tmp:` keys become local preview URLs. */
  toEditor(content: string): string {
    let result = content

    for (const [key, url] of this.urlsByKey) {
      result = result.split(key).join(url)
    }

    return result
  }

  /** Release the object URLs (call when the editor unmounts). */
  destroy(): void {
    for (const url of this.urlsByKey.values()) {
      URL.revokeObjectURL(url)
    }

    this.urlsByKey.clear()
  }
}
