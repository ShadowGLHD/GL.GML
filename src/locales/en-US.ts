import type { GmlMessages } from './types'

/** Create by AI */
export const messages = {
  unclosedTag: (tagName) => `Unclosed tag${tagName ? ` ${tagName}` : ''}`,
  unclosedString: 'Unclosed attribute value string',
  invalidName: (character) => `Invalid character: ${JSON.stringify(character)}`,
  unexpectedCharacter: (character) =>
    `Invalid character in attribute value: ${JSON.stringify(character)}`,
  unexpectedToken: (tokenType) => `Unexpected token: ${tokenType}`,
  missOpenTag: 'Expected an opening tag',
  missOpenTagName: 'Missing tag name in opening tag',
  missOpenTagEnd: (tagName) => `Missing > after tag <${tagName}>`,
  missCloseTagName: 'Missing tag name in closing tag',
  mismatchedTag: (expected, actual) => `Expected closing tag </${expected}>, but got </${actual}>`,
  maxDepth: (maxDepth) => `Tag nesting exceeds the maximum depth of ${maxDepth}`,
  missCloseTagEnd: (tagName) => `Missing > after closing tag </${tagName}>`,
  duplicateAttribute: (attributeName) => `Duplicate attribute ${attributeName}`,
  missAttributeEquals: (attributeName) => `Missing = after attribute ${attributeName}`,
  unquotedAttribute: (attributeName) => `The value of attribute ${attributeName} must be quoted`,
  missingEofToken: 'The token sequence received by the GML parser is missing EOF',
  invalidMaxDepth: (value) =>
    `The maximum GML nesting depth must be a positive integer; received: ${String(value)}`,
  unsupportedTag: (tagName) => `Unregistered tag found: ${tagName}`,
} satisfies GmlMessages
