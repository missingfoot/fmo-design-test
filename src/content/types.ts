export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; caption: string };

export interface ArticleMeta {
  author: string;
  /** ISO date (YYYY-MM-DD) */
  publishedAt: string;
  /** ISO date (YYYY-MM-DD) */
  updatedAt: string;
  updatedBy: string;
}
