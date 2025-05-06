import FirecrawlApp from 'firecrawl';
import type { 
  FirecrawlConfig, 
  ScrapeOptions, 
  CrawlOptions, 
  FirecrawlScrapeResult,
  FirecrawlCrawlResult,
  FirecrawlFormat 
} from '../types/firecrawl';

// Initialize Firecrawl client
const FIRECRAWL_API_KEY = process.env.VITE_FIRECRAWL_API_KEY || '';

if (!FIRECRAWL_API_KEY) {
  console.warn('Firecrawl API key not found in environment variables');
}

const config: FirecrawlConfig = {
  apiKey: FIRECRAWL_API_KEY
};

export const firecrawlClient = new FirecrawlApp(config);

const DEFAULT_FORMATS: FirecrawlFormat[] = ['markdown', 'html'];

// Scraping functions
export const scrapeSingleUrl = async (url: string, options?: ScrapeOptions): Promise<FirecrawlScrapeResult> => {
  try {
    const result = await firecrawlClient.scrapeUrl(url, options || {
      formats: DEFAULT_FORMATS
    });
    return result;
  } catch (error) {
    console.error('Error scraping URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Crawling functions
export const crawlWebsite = async (url: string, options?: CrawlOptions): Promise<FirecrawlCrawlResult> => {
  try {
    const result = await firecrawlClient.crawlUrl(url, options || {
      limit: 10,
      scrapeOptions: { formats: DEFAULT_FORMATS }
    });
    return result;
  } catch (error) {
    console.error('Error crawling website:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Extract structured data
export const extractStructuredData = async (url: string, prompt: string): Promise<FirecrawlScrapeResult> => {
  try {
    const result = await firecrawlClient.scrapeUrl(url, {
      formats: ['json'],
      jsonOptions: {
        prompt,
        systemPrompt: 'Extract structured data from the provided content.'
      }
    });
    return result;
  } catch (error) {
    console.error('Error extracting structured data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}; 