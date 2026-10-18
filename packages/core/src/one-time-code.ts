/**
 * `OneTimeCodeInput`: the digits of a typed, pasted or autofilled code, and submitting the
 * form once per complete code (`submitOnCompletion()`).
 */

/** The digits of `raw` (spaces, dashes and letters dropped), at most `length` of them. */
export function oneTimeCodeDigits(raw: string, length: number): string {
  let digits = ''

  // Full-width digits become ASCII with NFKC; Arabic-Indic and Persian ones are mapped.
  for (const character of raw.normalize('NFKC')) {
    const code = character.charCodeAt(0)

    if (code >= 48 && code <= 57) digits += character
    else if (code >= 0x0660 && code <= 0x0669) digits += String(code - 0x0660)
    else if (code >= 0x06f0 && code <= 0x06f9) digits += String(code - 0x06f0)
  }

  return digits.slice(0, Math.max(1, length))
}

/**
 * Submits the form when the code is complete, once per complete value: editing the code
 * (going below `length` digits) allows the next complete value to submit again.
 */
export class OneTimeCodeSubmitter {
  private lastSubmitted: string | null = null

  /** Call with the current code and the code's length; returns true when it submitted. */
  update(code: string, length: number, form: HTMLFormElement | null | undefined): boolean {
    if (code.length < length) {
      this.lastSubmitted = null

      return false
    }

    if (code === this.lastSubmitted || !form) return false

    this.lastSubmitted = code
    form.requestSubmit()

    return true
  }
}
