export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string | undefined;
  url: string;
  extractor: string;
}
