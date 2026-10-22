import { describe, expect, it } from 'vitest';

import type { SearchResult } from '@/types/search';
import { orderSearchResultsForDisplay } from './searchResultOrder';

function result(entity_type: SearchResult['entity_type'], entity_id: string): SearchResult {
  return {
    entity_type,
    entity_id,
    title: entity_id,
    subtitle: '',
    image_url: null,
    image_blurhash: null,
    url: `/${entity_id}`,
    rank: 0,
  };
}

describe('orderSearchResultsForDisplay', () => {
  it('follows visual section order when relevance order differs', () => {
    const ordered = orderSearchResultsForDisplay([
      result('gear', 'gear'),
      result('tags', 'tag'),
      result('scene-events', 'scene'),
    ]);

    expect(ordered.map((item) => item.entity_type)).toEqual([
      'gear',
      'scene-events',
      'tags',
    ]);
  });

  it('keeps relevance order inside a section', () => {
    const ordered = orderSearchResultsForDisplay([
      result('tags', 'tag-a'),
      result('gear', 'gear-b'),
      result('tags', 'tag-b'),
      result('gear', 'gear-a'),
    ]);

    expect(ordered.map((item) => item.entity_id)).toEqual([
      'gear-b',
      'gear-a',
      'tag-a',
      'tag-b',
    ]);
  });
});
