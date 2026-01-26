export type SearchEntityType = 'albums' | 'photos' | 'members' | 'events' | 'tags';

export type SearchResult = {
  entity_type: SearchEntityType;
  entity_id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  url: string | null;
  rank: number;
};

export type SearchResponse = {
  results: SearchResult[];
  query: string;
  total: number;
};
