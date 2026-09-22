import { describe, expect, it } from 'vitest'
import { collectTags, flatten, getParameter, getProps } from '../src/renderer/renderer'
import type { DocumentNode, ElementNode } from '../src/core'

describe('renderer helpers', () => {
  it('flattens plain objects but preserves arrays and scalar values', () => {
    expect(flatten({ user: { name: 'Alice', age: 5 }, rows: [{ id: 1 }] })).toEqual({
      user_name: 'Alice',
      user_age: 5,
      rows: [{ id: 1 }],
    })
  })

  it('resolves parameters and dynamic attributes by exact key', () => {
    expect(getParameter({ type: 'parameter', name: 'user_name', range: {} as never }, { user_name: 'Alice' })).toBe(
      'Alice',
    )

    const element: ElementNode = {
      type: 'element',
      name: 'image',
      attributes: [
        { type: 'attribute', name: 'alt', value: 'avatar', range: {} as never },
        { type: 'binding', name: 'source', parameter: 'image_url', range: {} as never },
      ],
      children: [],
      range: {} as never,
    }
    expect(getProps(element, { image_url: '/avatar.webp' })).toEqual({
      alt: 'avatar',
      source: '/avatar.webp',
    })
  })

  it('collects nested unregistered tags once and in sorted order', () => {
    const document: DocumentNode = {
      type: 'document',
      children: [
        {
          type: 'element',
          name: 'z-widget',
          attributes: [],
          children: [
            {
              type: 'element',
              name: 'a-widget',
              attributes: [],
              children: [],
              range: {} as never,
            },
            {
              type: 'element',
              name: 'z-widget',
              attributes: [],
              children: [],
              range: {} as never,
            },
          ],
          range: {} as never,
        },
      ],
    }

    expect(collectTags(document, {})).toEqual(['a-widget', 'z-widget'])
  })
})
