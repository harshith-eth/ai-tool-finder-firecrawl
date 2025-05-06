export type FirecrawlFormat = 
  | 'markdown'
  | 'html'
  | 'rawHtml'
  | 'content'
  | 'links'
  | 'screenshot'
  | 'screenshot@fullPage'
  | 'extract'
  | 'json'
  | 'changeTracking';

export interface FirecrawlConfig {
  apiKey: string;
}

export interface ScrapeOptions {
  formats?: FirecrawlFormat[];
  jsonOptions?: {
    prompt?: string;
    schema?: any;
    systemPrompt?: string;
  };
  proxy?: 'basic' | 'stealth';
  agent?: {
    model: string;
    prompt: string;
    [key: string]: any;
  };
  pageOptions?: {
    onlyMainContent?: boolean;
    waitFor?: number;
    includeHtml?: boolean;
    fetchPageContent?: boolean;
  };
  headers?: Record<string, string>;
  onlyMainContent?: boolean;
  waitFor?: number;
  includeHtml?: boolean;
  fetchPageContent?: boolean;
}

export interface CrawlOptions {
  limit?: number;
  scrapeOptions?: ScrapeOptions;
  proxy?: 'basic' | 'stealth';
}

export interface SearchOptions {
  pageOptions?: {
    fetchPageContent?: boolean;
    onlyMainContent?: boolean;
  }
  limit?: number;
}

export interface FirecrawlMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
  [key: string]: any;
}

export interface FirecrawlDocument {
  markdown?: string;
  html?: string;
  json?: any;
  metadata?: FirecrawlMetadata;
  url?: string;
  title?: string;
  description?: string;
  content?: string;
}

export interface ScrapeResponse {
  success: true;
  data: FirecrawlDocument;
}

export interface CrawlResponse {
  success: true;
  status: string;
  total: number;
  completed: number;
  creditsUsed: number;
  data: FirecrawlDocument[];
}

export interface SearchResponse {
  success: true;
  data: FirecrawlDocument[];
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type FirecrawlScrapeResult = ScrapeResponse | ErrorResponse;
export type FirecrawlCrawlResult = CrawlResponse | ErrorResponse;
export type FirecrawlSearchResult = SearchResponse | ErrorResponse; 