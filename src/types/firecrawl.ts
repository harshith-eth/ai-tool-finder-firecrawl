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

export interface AgentOptions {
  model: string;
  prompt?: string;
}

export interface JsonOptions {
  prompt?: string;
  systemPrompt?: string;
  extractionSchema?: Record<string, any>;
  mode?: string;
  pageOptions?: {
    onlyMainContent?: boolean;
  };
}

export interface ActionOption {
  type: string;
  milliseconds?: number;
  selector?: string;
  text?: string;
  key?: string;
}

export interface ScrapeOptions {
  formats?: FirecrawlFormat[];
  jsonOptions?: JsonOptions;
  proxy?: 'basic' | 'stealth';
  agent?: AgentOptions;
  actions?: ActionOption[];
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
  headers?: Record<string, string>;
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
  actions?: {
    screenshots?: string[];
    scrapes?: Array<{url: string, html: string}>;
  };
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

// Define ToolPricingTier here if it's specific to how tools are structured in the app
// Or ensure it's exported from a shared types file if used elsewhere
export interface ToolPricingTier {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
} 