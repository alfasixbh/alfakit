/** Convert a PHP date format to a date-fns format string (common tokens only). */
export function phpToDateFnsFormat(format: string): string {
  const map: Record<string, string> = {
    d: 'dd',
    j: 'd',
    D: 'EEE',
    l: 'EEEE',
    m: 'MM',
    n: 'M',
    M: 'MMM',
    F: 'MMMM',
    Y: 'yyyy',
    y: 'yy',
    H: 'HH',
    G: 'H',
    h: 'hh',
    g: 'h',
    i: 'mm',
    s: 'ss',
    A: 'a',
    a: 'aaa',
    U: 't',
  }

  const literal = (char: string) => (/[a-z]/i.test(char) ? `'${char}'` : char)
  let output = ''

  for (let index = 0; index < format.length; index++) {
    const char = format[index] ?? ''

    // PHP's escape: the next character is text (`Y-m-d\TH:i`), not a token.
    if (char === '\\' && index + 1 < format.length) {
      output += literal(format[++index] ?? '')

      continue
    }

    output += map[char] ?? literal(char)
  }

  return output
}
