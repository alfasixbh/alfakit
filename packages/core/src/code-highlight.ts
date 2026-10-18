/**
 * A small, dependency-free syntax highlighter for the CodeEditor field. It splits code
 * into typed tokens with a few regular expressions per language; renderers turn tokens
 * into styled text nodes (never HTML strings), so highlighted code cannot inject markup.
 */

export type CodeTokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'literal'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'variable'

export interface CodeToken {
  kind: CodeTokenKind
  text: string
}

type Rule = [CodeTokenKind, RegExp]

const words = (list: string, flags = 'y'): RegExp =>
  new RegExp(`(?:${list.split(' ').join('|')})\\b`, flags)

const NUMBER: Rule = ['number', /(?:0x[\da-f]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b/iy]
const IDENTIFIER: Rule = ['plain', /[A-Za-z_$][\w$]*/y]
const DQ: Rule = ['string', /"(?:[^"\\\n]|\\.)*"?/y]
const SQ: Rule = ['string', /'(?:[^'\\\n]|\\.)*'?/y]
const BLOCK_COMMENT: Rule = ['comment', /\/\*[\s\S]*?(?:\*\/|$)/y]
const LINE_COMMENT: Rule = ['comment', /\/\/.*/y]
const HASH_COMMENT: Rule = ['comment', /#.*/y]
const LITERALS: Rule = [
  'literal',
  words('true false null undefined NULL TRUE FALSE None True False nil'),
]

const JS_KEYWORDS =
  'abstract as async await break case catch class const continue debugger declare default delete do else enum export extends finally for from function get if implements import in instanceof interface let new of private protected public readonly return set static super switch this throw try type typeof var void while with yield'

const cLike = (keywords: string, extra: Rule[] = []): Rule[] => [
  BLOCK_COMMENT,
  LINE_COMMENT,
  ...extra,
  DQ,
  SQ,
  NUMBER,
  LITERALS,
  ['keyword', words(keywords)],
  IDENTIFIER,
]

const markup: Rule[] = [
  ['comment', /<!--[\s\S]*?(?:-->|$)/y],
  ['keyword', /<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<![A-Za-z][^>]*>|<\?[\s\S]*?(?:\?>|$)/y],
  ['tag', /<\/?[A-Za-z][\w:.-]*|\/?>/y],
  ['attribute', /[A-Za-z_:][\w:.-]*(?=\s*=)/y],
  ['string', /"[^"\n]*"|'[^'\n]*'/y],
  ['plain', /[^<"'=\s/>]+/y],
]

const LANGUAGES: Record<string, Rule[]> = {
  javascript: cLike(JS_KEYWORDS, [['string', /`(?:[^`\\]|\\.)*`?/y]]),
  typescript: cLike(`${JS_KEYWORDS} keyof namespace never unknown any`, [
    ['string', /`(?:[^`\\]|\\.)*`?/y],
  ]),
  java: cLike(
    'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static super switch synchronized this throw throws transient try void volatile while var record',
  ),
  cpp: cLike(
    'auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern float for friend goto if inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw try typedef typename union unsigned using virtual void volatile while',
    [['keyword', /#\s*[a-z]+/y]],
  ),
  go: cLike(
    'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var',
    [['string', /`[^`]*`?/y]],
  ),
  php: cLike(
    'abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list match namespace new or print private protected public readonly require require_once return static switch throw trait try unset use var while xor yield',
    [HASH_COMMENT, ['keyword', /<\?php|<\?=|\?>/y], ['variable', /\$[A-Za-z_]\w*/y]],
  ),
  python: [
    HASH_COMMENT,
    ['string', /(?:[rbuf]{0,2})(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/iy],
    ['string', /(?:[rbuf]{0,2})(?:"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/iy],
    NUMBER,
    LITERALS,
    [
      'keyword',
      words(
        'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self',
      ),
    ],
    ['attribute', /@[\w.]+/y],
    IDENTIFIER,
  ],
  json: [
    ['property', /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y],
    DQ,
    ['number', /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/iy],
    LITERALS,
  ],
  yaml: [
    HASH_COMMENT,
    ['property', /[^\s:#'"-][^:#\n]*(?=:(?:\s|$))/y],
    DQ,
    SQ,
    NUMBER,
    LITERALS,
    ['keyword', /^---$|[&*][\w-]+|!![\w]+/my],
  ],
  css: [
    BLOCK_COMMENT,
    DQ,
    SQ,
    ['keyword', /@[\w-]+/y],
    ['property', /--?[\w-]+(?=\s*:)|[a-z-]+(?=\s*:[^{};]*;)/y],
    ['number', /#[\da-f]{3,8}\b|-?\d*\.?\d+(?:%|[a-z]+)?/iy],
    ['attribute', /[.#][\w-]+/y],
    ['plain', /[\w-]+/y],
  ],
  sql: [
    ['comment', /--.*/y],
    BLOCK_COMMENT,
    SQ,
    DQ,
    ['variable', /`[^`]*`?/y],
    NUMBER,
    LITERALS,
    [
      'keyword',
      words(
        'add all alter and as asc between by case check column constraint create cross database default delete desc distinct drop else end exists foreign from full group having in index inner insert into is join key left like limit not null offset on or order outer primary references right select set table then union unique update values view when where with',
        'iy',
      ),
    ],
    IDENTIFIER,
  ],
  markdown: [
    ['keyword', /^#{1,6}[ \t].*/my],
    ['string', /```[\s\S]*?(?:```|$)|`[^`\n]*`?/y],
    ['attribute', /!?\[[^\]\n]*\]\([^)\n]*\)/y],
    ['keyword', /\*\*[^*\n]+\*\*|__[^_\n]+__/y],
    ['comment', /^>.*/my],
    ['tag', /^[ \t]*(?:[-*+]|\d+\.)(?=[ \t])/my],
    ['plain', /[A-Za-z0-9]+/y],
  ],
}

LANGUAGES.html = markup
LANGUAGES.xml = markup
for (const [alias, language] of [
  ['js', 'javascript'],
  ['ts', 'typescript'],
  ['yml', 'yaml'],
  ['md', 'markdown'],
] as const) {
  LANGUAGES[alias] = LANGUAGES[language] as Rule[]
}

/** Languages the highlighter knows; others render as plain text. */
export function isHighlightedLanguage(language: string | null | undefined): boolean {
  return Boolean(language && LANGUAGES[language.toLowerCase()])
}

/** Split `code` into tokens. Adjacent plain text is merged into one token. */
export function highlightCode(code: string, language?: string | null): CodeToken[] {
  const rules = language ? LANGUAGES[language.toLowerCase()] : undefined

  if (!rules || code === '') {
    return code === '' ? [] : [{ kind: 'plain', text: code }]
  }

  const tokens: CodeToken[] = []
  const push = (kind: CodeTokenKind, text: string) => {
    const last = tokens[tokens.length - 1]

    if (last && last.kind === kind && kind === 'plain') {
      last.text += text
    } else {
      tokens.push({ kind, text })
    }
  }

  let position = 0

  while (position < code.length) {
    let matched = false

    for (const [kind, pattern] of rules) {
      pattern.lastIndex = position
      const match = pattern.exec(code)

      if (match && match[0].length > 0) {
        push(kind, match[0])
        position += match[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      push('plain', code[position] as string)
      position++
    }
  }

  return tokens
}

/** Number of lines in `code` (at least one). */
export function countCodeLines(code: string): number {
  let lines = 1

  for (let index = 0; index < code.length; index++) {
    if (code.charCodeAt(index) === 10) lines++
  }

  return lines
}
