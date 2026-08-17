/** <code> 独占行书写时, 是否移除代码正文首尾各一个排版换行 */
export const TRIM_CODE_BOUNDARY_NEWLINES = true

/** 是否将合法注释写入 AST */
export const PRESERVE_COMMENTS = false

/** 最大标签嵌套层数 */
export const MAX_NESTING_DEPTH = 32

/** GML 名称中不允许出现的标点字符 */
export const NAME_CHAR_BLACKLIST = new Set([...`!"#$%&'()*+,./:;<=>?@[\\]^\`{|}~`])
