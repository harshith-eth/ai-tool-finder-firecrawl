import FirecrawlApp from 'firecrawl';
import type { 
  FirecrawlConfig, 
  ScrapeOptions, 
  CrawlOptions, 
  FirecrawlScrapeResult,
  FirecrawlCrawlResult,
  FirecrawlFormat,
  CrawlResponse,
  SearchOptions,
  FirecrawlSearchResult,
  SearchResponse,
  FirecrawlDocument,
  AgentOptions,
  JsonOptions,
  ActionOption
} from '../types/firecrawl';

// Initialize Firecrawl client
const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY || '';

if (!FIRECRAWL_API_KEY) {
  console.warn('Firecrawl API key not found in environment variables');
}

const config: FirecrawlConfig = {
  apiKey: FIRECRAWL_API_KEY
};

export const firecrawlClient = new FirecrawlApp(config);

// Make sure we only include formats that don't require special options
const DEFAULT_FORMATS: FirecrawlFormat[] = ['markdown', 'html'];

/**
 * Scrape a single URL with optional configuration
 */
export const scrapeSingleUrl = async (url: string, options?: ScrapeOptions): Promise<FirecrawlScrapeResult> => {
  try {
    // Ensure if formats includes 'json', we have jsonOptions
    const safeOptions = options ? { ...options } : { formats: DEFAULT_FORMATS };
    
    // Extract proxy and agent options (API doesn't accept them directly in the request body)
    const proxyOption = safeOptions.proxy || 'stealth'; // Default to stealth proxy for better anti-bot bypassing
    const agentOption = safeOptions.agent;
    
    // Remove them from the options to prevent API errors
    delete safeOptions.proxy;
    delete safeOptions.agent;
    
    // Handle case where formats includes 'json' but no jsonOptions provided
    if (safeOptions.formats?.includes('json') && !safeOptions.jsonOptions) {
      console.warn('JSON format requested without jsonOptions, removing json from formats');
      safeOptions.formats = safeOptions.formats.filter(format => format !== 'json');
    }
    
    // Ensure we have at least one format
    if (!safeOptions.formats || safeOptions.formats.length === 0) {
      safeOptions.formats = DEFAULT_FORMATS;
    }
    
    // Create streamlined API options
    const apiOptions: Record<string, any> = { 
      formats: safeOptions.formats
    };
    
    // Add jsonOptions if needed
    if (safeOptions.jsonOptions) {
      apiOptions.jsonOptions = safeOptions.jsonOptions;
    }
    
    // Add actions if provided
    if (safeOptions.actions && safeOptions.actions.length > 0) {
      apiOptions.actions = safeOptions.actions;
    }
    
    // Add top-level options from pageOptions or defaults
    apiOptions.onlyMainContent = safeOptions.pageOptions?.onlyMainContent ?? true;
    
    if (safeOptions.pageOptions?.waitFor) {
      apiOptions.waitFor = safeOptions.pageOptions.waitFor;
    }
    
    if (safeOptions.pageOptions?.includeHtml) {
      apiOptions.includeHtml = safeOptions.pageOptions.includeHtml;
    }
    
    if (safeOptions.pageOptions?.fetchPageContent) {
      apiOptions.fetchPageContent = safeOptions.pageOptions.fetchPageContent;
    }
    
    // Add agent if provided (FIRE-1 support)
    if (agentOption) {
      apiOptions.agent = {
        model: agentOption.model || 'FIRE-1',
        prompt: agentOption.prompt || undefined
      };
    }
    
    // Handle proxy via headers
    apiOptions.headers = {
      'X-Firecrawl-Proxy': proxyOption
    };
    
    // Add any custom headers if provided
    if (safeOptions.headers) {
      apiOptions.headers = {
        ...apiOptions.headers,
        ...safeOptions.headers
      };
    }
    
    // Add retry logic for robustness
    let attempts = 0;
    const maxAttempts = 3;
    let result;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1}/${maxAttempts} to scrape ${url}`);
        
        // Make the API call with clean options
        result = await firecrawlClient.scrapeUrl(url, apiOptions);
        
        if (result.success) {
          console.log(`Successfully scraped ${url} on attempt ${attempts + 1}`);
          break;
        } else {
          console.error(`Failed attempt ${attempts + 1}/${maxAttempts}:`, result.error);
          attempts++;
          
          if (attempts < maxAttempts) {
            // Wait for 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try a different proxy approach on subsequent attempts
            if (apiOptions.headers['X-Firecrawl-Proxy'] === 'stealth') {
              apiOptions.headers['X-Firecrawl-Proxy'] = 'basic';
              console.log('Switching to basic proxy for next attempt');
            } else {
              apiOptions.headers['X-Firecrawl-Proxy'] = 'stealth';
              console.log('Switching to stealth proxy for next attempt');
            }
            
            // For next attempts, simplify the request to bare minimum
            if (attempts === maxAttempts - 1) {
              // Last attempt - use minimal options
              apiOptions.formats = ['markdown'];
              delete apiOptions.jsonOptions;
              delete apiOptions.onlyMainContent;
              delete apiOptions.waitFor;
              delete apiOptions.agent; // Remove agent for simplicity in final attempt
              console.log('Simplifying request options for final attempt');
            }
          }
        }
      } catch (attemptError) {
        console.error(`Error on attempt ${attempts + 1}/${maxAttempts}:`, attemptError);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (result && result.success) {
      return {
        success: true,
        data: 'data' in result ? result.data : undefined
      } as FirecrawlScrapeResult;
    } else {
      console.error('API error after all retry attempts:', result ? result.error : 'No result received');
      return {
        success: false,
        error: result && 'error' in result ? result.error : 'Unknown error occurred after multiple attempts'
      };
    }
  } catch (error) {
    console.error('Error scraping URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Crawl a website with specified options
 */
export const crawlWebsite = async (url: string, options?: CrawlOptions): Promise<FirecrawlCrawlResult> => {
  try {
    const safeOptions = options ? { ...options } : { limit: 10, scrapeOptions: { formats: DEFAULT_FORMATS } };
    
    // Extract proxy option (API doesn't accept it directly in the request body)
    const proxyOption = safeOptions.proxy;
    
    // Remove it from the options to prevent API errors
    delete safeOptions.proxy;
    
    // Handle case where scrapeOptions formats includes 'json' but no jsonOptions provided
    if (safeOptions.scrapeOptions?.formats?.includes('json') && !safeOptions.scrapeOptions.jsonOptions) {
      console.warn('JSON format requested without jsonOptions in crawl, removing json from formats');
      safeOptions.scrapeOptions.formats = safeOptions.scrapeOptions.formats.filter(format => format !== 'json');
    }
    
    // Ensure we have at least one format
    if (!safeOptions.scrapeOptions?.formats || safeOptions.scrapeOptions.formats.length === 0) {
      if (!safeOptions.scrapeOptions) {
        safeOptions.scrapeOptions = { formats: DEFAULT_FORMATS };
      } else {
        safeOptions.scrapeOptions.formats = DEFAULT_FORMATS;
      }
    }
    
    // Create request options with headers for proxy if needed
    const apiOptions: Record<string, any> = { ...safeOptions };
    
    // Handle proxy option
    if (proxyOption) {
      console.log(`Using ${proxyOption} proxy for crawl request`);
      
      // Set it in the headers
      apiOptions.headers = {
        ...(apiOptions.headers || {}),
        'X-Firecrawl-Proxy': proxyOption
      };
    }
    
    // Add retry logic for crawl
    let attempts = 0;
    const maxAttempts = 2; // Fewer attempts for crawling as it's more intensive
    let result: any = null; // Initialize result to null to avoid undefined
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Crawl attempt ${attempts + 1}/${maxAttempts} for ${url}`);
        
        // Make the API call
        result = await firecrawlClient.crawlUrl(url, apiOptions);
        
        if (result.success) {
          console.log(`Successfully crawled ${url} on attempt ${attempts + 1}`);
          break;
        } else {
          console.error(`Failed crawl attempt ${attempts + 1}/${maxAttempts}:`, result.error);
          attempts++;
          
          if (attempts < maxAttempts) {
            // Wait for 3 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Simplify options for the next attempt
            if (apiOptions.scrapeOptions) {
              apiOptions.scrapeOptions.formats = ['markdown'];
              delete apiOptions.scrapeOptions.jsonOptions;
            }
            
            // Reduce limit for next attempt
            if (apiOptions.limit > 5) {
              apiOptions.limit = 5;
            }
          }
        }
      } catch (attemptError) {
        console.error(`Error on crawl attempt ${attempts + 1}/${maxAttempts}:`, attemptError);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (result && result.success) {
      return {
        success: true,
        status: 'completed',
        total: 'data' in result ? result.data.length : 0,
        completed: 'data' in result ? result.data.length : 0,
        creditsUsed: 0,
        data: 'data' in result ? result.data : []
      } as CrawlResponse;
    } else {
      console.error('API error response:', result ? result.error : 'Unknown error occurred');
      return {
        success: false,
        error: result && 'error' in result ? result.error : 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error crawling website:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extract structured data using LLM extraction with or without schema
 */
export const extractStructuredData = async (
  url: string, 
  prompt: string,
  options?: {
    systemPrompt?: string,
    extractionSchema?: Record<string, any>,
    agent?: AgentOptions,
    proxy?: 'basic' | 'stealth'
  }
): Promise<FirecrawlScrapeResult> => {
  try {
    // Prepare JSON options
    const jsonOptions: JsonOptions = {
      prompt,
      systemPrompt: options?.systemPrompt || 'Extract structured data from the provided content.'
    };
    
    // Add extraction schema if provided
    if (options?.extractionSchema) {
      jsonOptions.extractionSchema = options.extractionSchema;
      jsonOptions.mode = 'llm-extraction';
    }
    
    // Prepare scrape options
    const scrapeOptions: ScrapeOptions = {
      formats: ['json'],
      jsonOptions,
      proxy: options?.proxy || 'stealth'
    };
    
    // Add FIRE-1 agent if requested
    if (options?.agent) {
      scrapeOptions.agent = {
        model: options.agent.model || 'FIRE-1',
        prompt: options.agent.prompt
      };
    }
    
    // Execute the scrape operation
    const result = await scrapeSingleUrl(url, scrapeOptions);
    
    if (result.success) {
      return {
        success: true,
        data: 'data' in result ? result.data : undefined
      } as FirecrawlScrapeResult;
    } else {
      return {
        success: false,
        error: 'error' in result ? result.error : 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error extracting structured data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Execute a search using Firecrawl's search capabilities
 */
export const searchWithFirecrawl = async (query: string, options?: SearchOptions): Promise<FirecrawlSearchResult> => {
  try {
    console.log(`Searching with Firecrawl for: "${query}"`);
    
    // Create clean search options
    const apiOptions: Record<string, any> = { };
    
    // Add limit if provided
    if (options?.limit) {
      apiOptions.limit = options.limit;
    }
    
    // Add page options directly to the API options object
    if (options?.pageOptions?.fetchPageContent) {
      apiOptions.fetchPageContent = options.pageOptions.fetchPageContent;
    } else {
      apiOptions.fetchPageContent = true; // Default
    }
    
    if (options?.pageOptions?.onlyMainContent) {
      apiOptions.onlyMainContent = options.pageOptions.onlyMainContent;
    }
    
    // Add retry logic for search
    let attempts = 0;
    const maxAttempts = 3;
    let result;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Search attempt ${attempts + 1}/${maxAttempts} for "${query}"`);
        
        // Make the search API call
        result = await firecrawlClient.search(query, apiOptions);
        
        if (result.success) {
          console.log(`Search successful on attempt ${attempts + 1}`);
          break;
        } else {
          console.error(`Failed search attempt ${attempts + 1}/${maxAttempts}:`, result.error);
          attempts++;
          
          if (attempts < maxAttempts) {
            // Wait for 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For the last attempt, simplify options
            if (attempts === maxAttempts - 1) {
              // Minimal options for last attempt
              Object.keys(apiOptions).forEach(key => {
                if (key !== 'limit') delete apiOptions[key];
              });
              console.log('Simplifying search options for final attempt');
            }
          }
        }
      } catch (attemptError) {
        console.error(`Error on search attempt ${attempts + 1}/${maxAttempts}:`, attemptError);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (result && result.success) {
      console.log(`Search successful, found ${result.data?.length || 0} results`);
      return {
        success: true,
        data: result.data
      } as SearchResponse;
    } else {
      console.error('Search API error after all retry attempts:', result ? result.error : 'No result received');
      return {
        success: false,
        error: result && result.error ? result.error : 'Unknown error occurred during search'
      };
    }
  } catch (error) {
    console.error('Error performing search:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extract tool information using FIRE-1 agent
 * This is a specialized function for extracting AI tool information
 */
export const extractToolInfoWithAgent = async (url: string): Promise<FirecrawlScrapeResult> => {
  try {
    console.log(`Extracting tool information from: ${url} using FIRE-1 agent`);
    
    // Define extraction schema for tool information
    const extractionSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        description: { type: "string" },
        pricing: { type: "string" },
        features: { 
          type: "array",
          items: { type: "string" }
        },
        useCases: {
          type: "array",
          items: { type: "string" }
        },
        pros: {
          type: "array",
          items: { type: "string" }
        },
        cons: {
          type: "array",
          items: { type: "string" }
        },
        websiteUrl: { type: "string" },
        imageUrl: { type: "string" },
        videoUrl: { type: "string" },
        categories: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["name", "description"]
    };
    
    // Define agent prompt for better extraction
    const agentPrompt = `
      Navigate through this AI tool's website.
      Look for key information like features, pricing, use cases, pros/cons.
      If there's a demo video, note its URL.
      If pricing isn't immediately visible, check for a pricing page link and navigate to it.
      Look for screenshots or product images.
    `;
    
    // Use the extraction function with FIRE-1 agent
    const result = await extractStructuredData(
      url,
      "Extract comprehensive information about this AI tool including its name, description, pricing, features, use cases, pros, cons, and any visual content.",
      {
        systemPrompt: "You are an AI tool information extractor. Your goal is to gather complete information about AI tools.",
        extractionSchema,
        agent: {
          model: "FIRE-1",
          prompt: agentPrompt
        },
        proxy: "stealth"
      }
    );
    
    if (result.success) {
      return {
        success: true,
        data: 'data' in result ? result.data : undefined
      } as FirecrawlScrapeResult;
    } else {
      console.error('API error extracting tool info with FIRE-1:', result.error);
      
      // Fall back to regular extraction without agent
      console.log('Falling back to regular extraction without agent');
      
      return await scrapeSingleUrl(url, {
        formats: ['markdown', 'json'],
        jsonOptions: {
          prompt: "Extract information about this AI tool including name, description, features, and pricing.",
          extractionSchema
        },
        onlyMainContent: true,
        waitFor: 3000,
        proxy: 'stealth'
      });
    }
  } catch (error) {
    console.error('Error extracting tool info with agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extract AI tool information from a search results page
 * Specialized for ProductHunt but can work with other sites
 */
export const scrapeToolSearch = async (query: string, site: string = 'producthunt'): Promise<FirecrawlScrapeResult> => {
  try {
    console.log(`Scraping ${site} search for: "${query}"`);
    
    // Determine the appropriate URL based on site
    let url: string;
    if (site === 'producthunt') {
      url = `https://www.producthunt.com/search/products?q=${encodeURIComponent(query + " AI")}`;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(query + " AI tool")}`;
    }
    
    // Define actions for interacting with the page
    const actions: ActionOption[] = [
      { type: "wait", milliseconds: 3000 },
      { type: "scrape" },
      { type: "screenshot" }
    ];
    
    // Define extraction schema for AI tools
    const extractionSchema = {
      type: "object",
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              tagline: { type: "string" },
              url: { type: "string" },
              websiteUrl: { type: "string" },
              upvotes: { type: "number" },
              imageUrl: { type: "string" },
              categories: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["name", "description"]
          }
        }
      }
    };
    
    // Perform search and extraction with FIRE-1 agent for more accurate results
    const result = await scrapeSingleUrl(url, {
      formats: ['json', 'markdown'],
      jsonOptions: {
        prompt: `Extract AI tools related to "${query}" from this search page. For each tool, get the name, description, tagline, url, website URL, upvotes count, image URL, and categories.`,
        extractionSchema,
        mode: "llm-extraction"
      },
      actions,
      agent: {
        model: "FIRE-1",
        prompt: `Look for AI tools related to "${query}". Find product cards with names, descriptions, and links. If on ProductHunt, look for upvote counts and product images.`
      },
      proxy: "stealth",
      waitFor: 5000,
      onlyMainContent: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (result.success && result.data) {
      // If we got results, return them
      return {
        success: true,
        data: result.data
      } as FirecrawlScrapeResult;
    } else {
      // If FIRE-1 fails, try simple extraction
      console.error('FIRE-1 extraction failed, trying simple scraping');
      
      return await scrapeSingleUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 5000,
        proxy: 'stealth',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
    }
  } catch (error) {
    console.error(`Error scraping ${site} search:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}; 