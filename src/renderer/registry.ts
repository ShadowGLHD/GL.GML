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
import type { GmlRegistry } from './types'

/** 内置标签注册表 */
export const defaultGmlRegistry: GmlRegistry = Object.freeze({
  title: GmlTitle,
  section: GmlSection,
  heading: GmlHeading,
  paragraph: GmlParagraph,
  image: GmlImage,
  code: GmlCode,
  list: GmlList,
  item: GmlItem,
  strong: GmlStrong,
  emphasis: GmlEmphasis,
  link: GmlLink,
})
