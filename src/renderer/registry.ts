import GmlCode from './components/GmlCode.vue'
import GmlEmphasis from './components/GmlEmphasis.vue'
import GmlHeading from './components/GmlHeading.vue'
import GmlImage from './components/GmlImage.vue'
import GmlItem from './components/GmlItem.vue'
import GmlLink from './components/GmlLink.vue'
import GmlList from './components/GmlList.vue'
import GmlParagraph from './components/GmlParagraph.vue'
import GmlSection from './components/GmlSection.vue'
import GmlStrong from './components/GmlStrong.vue'
import GmlTitle from './components/GmlTitle.vue'
import type { GmlComponentRegistry } from './types'

/** 静态属性是字符串，动态属性保留页面传入类型；这里统一转换可选数字。 */
function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value !== 'string' || !value) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * 内置标签注册表。
 *
 * 每个键对应一个大小写敏感的 GML 标签。GmlRenderer 会用调用者传入的 registry
 * 覆盖同名定义，因此项目可以用自己的组件替换 image 等默认实现。
 */
export const defaultGmlRegistry: GmlComponentRegistry = Object.freeze({
  title: {
    component: GmlTitle,
  },
  section: {
    component: GmlSection,
    attributes: ['name'],
    transformAttributes: (attributes) => ({ name: optionalString(attributes.name) }),
  },
  heading: {
    component: GmlHeading,
    attributes: ['level'],
    transformAttributes: (attributes) => ({ level: optionalNumber(attributes.level) ?? 2 }),
  },
  paragraph: {
    component: GmlParagraph,
  },
  image: {
    component: GmlImage,
    // onclick 等未进入白名单的文档属性不会传给图片组件。
    attributes: ['source', 'alt', 'caption', 'width', 'height'],
    transformAttributes: (attributes) => ({
      source: optionalString(attributes.source) ?? '',
      alt: optionalString(attributes.alt) ?? '',
      caption: optionalString(attributes.caption),
      width: optionalNumber(attributes.width),
      height: optionalNumber(attributes.height),
    }),
  },
  code: {
    component: GmlCode,
    attributes: ['language'],
    transformAttributes: (attributes) => ({ language: optionalString(attributes.language) }),
  },
  list: {
    component: GmlList,
    attributes: ['ordered'],
    // GML 没有原生布尔类型，这里把字符串 "true" 转换成 boolean。
    transformAttributes: (attributes) => ({
      ordered:
        typeof attributes.ordered === 'boolean'
          ? attributes.ordered
          : attributes.ordered === 'true',
    }),
  },
  item: {
    component: GmlItem,
  },
  strong: {
    component: GmlStrong,
  },
  emphasis: {
    component: GmlEmphasis,
  },
  link: {
    component: GmlLink,
    attributes: ['href', 'title', 'target'],
    transformAttributes: (attributes) => ({
      href: optionalString(attributes.href),
      title: optionalString(attributes.title),
      target: optionalString(attributes.target),
    }),
  },
})
