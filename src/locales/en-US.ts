import type { GmlMessages } from './types'

/** Create by AI */
export const messages = {
  unclosedTag: (tagName) => `Unclosed tag${tagName ? ` ${tagName}` : ''}`,
  unclosedComment: 'Unclosed comment',
  unclosedCode: 'Unclosed code block <code>',
  unclosedString: 'Unclosed attribute value string',
  invalidName: (character) => `Invalid character: ${JSON.stringify(character)}`,
  invalidParameter: (parameter) => `Invalid parameter name: ${JSON.stringify(parameter)}`,
  unexpectedToken: (tokenType) => `Unexpected token: ${tokenType}`,
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
  invalidTokenSequence: 'The GML token sequence must contain exactly one EOF at the end',
  unsupportedTag: (tagName) => `Unregistered tag found: ${tagName}`,
} satisfies GmlMessages
