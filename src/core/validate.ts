import { NAME_CHAR_BLACKLIST } from './constants'

/** 判断是否为空白符 */
export function isSpaceChar(character: string): boolean {
  if (!character) return false
  const code = character.charCodeAt(0)
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  )
}

/** 控制字符不可见, 也不适合作为稳定的组件注册键 */
function isCtrlChar(character: string): boolean {
  const code = character.charCodeAt(0)
  return (code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)
}

/** 判断字符是否合法 */
export function isGmlChar(character: string): boolean {
  return (
    character !== '' &&
    !isSpaceChar(character) &&
    !isCtrlChar(character) &&
    !NAME_CHAR_BLACKLIST.has(character)
  )
}

/** 判断字符串是否非空、且不包含黑名单字符 */
export function isGmlName(value: string): boolean {
  if (!value) return false
  for (const character of value) {
    if (!isGmlChar(character)) return false
  }
  return true
}
