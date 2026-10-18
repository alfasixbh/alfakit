const TOKENS: Record<string, RegExp> = {
  '9': /\d/,
  a: /\p{L}/u,
  '*': /[\p{L}\p{N}]/u,
}

/**
 * Format typed text with a `TextInput::mask()` pattern: `9` takes a digit, `a` a letter,
 * `*` a letter or digit, and any other character is inserted literally. Characters that
 * don't fit are dropped; literals are only added before the next typed character, so
 * deleting back over them works.
 */
export function applyMask(value: string, mask: string | null | undefined): string {
  if (!mask) {
    return value
  }

  let result = ''
  let position = 0

  for (const token of mask) {
    if (position >= value.length) {
      break
    }

    const pattern = TOKENS[token]

    if (!pattern) {
      result += token

      if (value[position] === token) position++

      continue
    }

    while (position < value.length && !pattern.test(value[position] as string)) {
      position++
    }

    if (position >= value.length) {
      break
    }

    result += value[position]
    position++
  }

  return result
}
