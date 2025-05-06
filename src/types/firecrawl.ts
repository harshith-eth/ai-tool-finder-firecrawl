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
}

export interface CrawlOptions {
  limit?: number;
  scrapeOptions?: ScrapeOptions;
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

export interface ErrorResponse {
  success: false;
  error: string;
}

export type FirecrawlScrapeResult = ScrapeResponse | ErrorResponse;
export type FirecrawlCrawlResult = CrawlResponse | ErrorResponse; 