export type SerpItem = {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
};

export type SerpMeta = {
  totalResults?: number;
  searchTime?: number;
  cache?: "hit" | "miss";
  provider?: "serper" | "google_cse";
};

export type SerpResponse = {
  query: string;
  items: SerpItem[];
  meta: SerpMeta;
};
