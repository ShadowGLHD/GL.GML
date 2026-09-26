/** Core 异常与 Renderer 诊断共用的语言包契约。 */
export interface GmlMessages {
  unclosedTag: (tagName: string) => string
  unclosedString: string
  invalidName: (character: string) => string
  unexpectedCharacter: (character: string) => string
  unexpectedToken: (tokenType: string) => string
  missOpenTag: string
  missOpenTagName: string
  missOpenTagEnd: (tagName: string) => string
  missCloseTagName: string
  mismatchedTag: (expected: string, actual: string) => string
  maxDepth: (maxDepth: number) => string
  missCloseTagEnd: (tagName: string) => string
  duplicateAttribute: (attributeName: string) => string
  missAttributeEquals: (attributeName: string) => string
  unquotedAttribute: (attributeName: string) => string
  missingEofToken: string
  invalidMaxDepth: (value: unknown) => string
  unsupportedTag: (tagName: string) => string
}
