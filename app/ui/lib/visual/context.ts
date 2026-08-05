export type OrielContext =
  | "browse"
  | "movie"
  | "stream"
  | "collection"
  | "search"
  | "about";

export function getContext(page: OrielContext): OrielContext {
  return page;
}
