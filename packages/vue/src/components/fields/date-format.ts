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

  return format
    .split('')
    .map((char) => map[char] ?? (/[a-z]/i.test(char) ? `'${char}'` : char))
    .join('')
}
