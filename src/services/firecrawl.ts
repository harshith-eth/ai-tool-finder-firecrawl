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
  FirecrawlDocument
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

// Scraping functions
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
    
    // Create the request URL
    let requestUrl = url;
    
    // Create streamlined API options
    const apiOptions: Record<string, any> = { 
      formats: safeOptions.formats
    };
    
    // Add jsonOptions if needed
    if (safeOptions.jsonOptions) {
      apiOptions.jsonOptions = safeOptions.jsonOptions;
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
    
    // Handle proxy via headers
    apiOptions.headers = {
      'X-Firecrawl-Proxy': proxyOption
    };
    
    // Add retry logic for robustness
    let attempts = 0;
    const maxAttempts = 3;
    let result;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1}/${maxAttempts} to scrape ${requestUrl}`);
        
        // Make the API call with clean options
        result = await firecrawlClient.scrapeUrl(requestUrl, apiOptions);
        
        if (result.success) {
          console.log(`Successfully scraped ${requestUrl} on attempt ${attempts + 1}`);
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

// Crawling functions
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
    
    // Ensure that if 'json' or 'extract' format is used, we provide the required path
    if (safeOptions.scrapeOptions?.formats?.includes('json') && safeOptions.scrapeOptions.jsonOptions) {
      if (!safeOptions.scrapeOptions.jsonOptions.schema) {
        safeOptions.scrapeOptions.jsonOptions.schema = { path: [] };
      } else if (!safeOptions.scrapeOptions.jsonOptions.schema.path) {
        safeOptions.scrapeOptions.jsonOptions.schema.path = [];
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
    
    const result = await firecrawlClient.crawlUrl(url, apiOptions);
    
    if (result.success) {
      return {
        success: true,
        status: 'completed',
        total: 'data' in result ? result.data.length : 0,
        completed: 'data' in result ? result.data.length : 0,
        creditsUsed: 0,
        data: 'data' in result ? result.data : []
      } as CrawlResponse;
    } else {
      console.error('API error response:', result.error);
      return {
        success: false,
        error: 'error' in result ? result.error : 'Unknown error occurred'
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

// Add search function using Firecrawl's search capabilities
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

// Extract structured data using schema for more reliable tool information
export const extractToolInfo = async (url: string): Promise<FirecrawlScrapeResult> => {
  try {
    console.log(`Extracting tool information from: ${url}`);
    
    const result = await firecrawlClient.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000,
      headers: {
        'X-Firecrawl-Proxy': 'stealth'
      }
    });
    
    if (result.success) {
      return {
        success: true,
        data: 'data' in result ? result.data : undefined
      } as FirecrawlScrapeResult;
    } else {
      console.error('API error extracting tool info:', result.error);
      return {
        success: false,
        error: 'error' in result ? result.error : 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error extracting tool info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Add specialized function for ProductHunt searches
export const scrapeProductHuntSearch = async (query: string): Promise<FirecrawlScrapeResult> => {
  try {
    console.log(`Scraping ProductHunt search for: "${query}"`);
    const url = `https://www.producthunt.com/search?q=${encodeURIComponent(query + " AI")}`;
    
    // Multiple attempts with different strategies
    const maxAttempts = 3;
    let attempts = 0;
    let result: any = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`ProductHunt search attempt ${attempts + 1}/${maxAttempts}`);
        
        // First try approach: direct HTML extraction
        const htmlOptions = {
          formats: ['html', 'markdown'] as FirecrawlFormat[],
          onlyMainContent: true,
          waitFor: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'X-Firecrawl-Proxy': attempts === 0 ? 'stealth' : 'basic'
          }
        };
        
        // Make the API call
        const htmlResult = await firecrawlClient.scrapeUrl(url, htmlOptions);
        const htmlData = htmlResult.success && 'data' in htmlResult ? htmlResult.data as FirecrawlDocument : null;
        
        if (htmlResult.success && htmlData) {
          // Now use the HTML result for LLM extraction
          const extractionPrompt = `
            Extract all AI tools related to "${query}" from this ProductHunt search results page.
            For each tool, extract:
            - name: The name of the tool
            - description: A brief description of what it does
            - url: The URL to the tool's page (should be a full URL starting with https://www.producthunt.com)
            - upvotes: The number of upvotes (as a number)
            - imageUrl: URL to the tool's logo or image

            Return as JSON array of objects with these properties. Extract at least 5 tools if available.
            If no tools are found, return an empty array.
          `;
          
          const llmOptions = {
            formats: ['json'] as FirecrawlFormat[],
            jsonOptions: {
              prompt: extractionPrompt
            }
          };
          
          const llmResult = await firecrawlClient.scrapeUrl(url, llmOptions);
          const llmData = llmResult.success && 'data' in llmResult ? llmResult.data as FirecrawlDocument : null;
          
          if (llmResult.success && llmData && llmData.json && Array.isArray(llmData.json)) {
            console.log(`LLM extraction successful, found ${llmData.json.length} products`);
            
            // Create a compatible result structure with appropriate type handling
            result = {
              success: true,
              data: {
                json: {
                  products: llmData.json
                },
                html: htmlData.html || ''
              }
            };
            break;
          } else {
            console.log('LLM extraction did not return products array, trying another method');
            attempts++;
            
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } else {
          console.log(`HTML extraction failed on attempt ${attempts + 1}`);
          attempts++;
          
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (attemptError) {
        console.error(`Error on ProductHunt search attempt ${attempts + 1}:`, attemptError);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (result && result.success && result.data) {
      return {
        success: true,
        data: result.data
      } as FirecrawlScrapeResult;
    } else {
      console.error('ProductHunt search failed after all attempts');
      return {
        success: false,
        error: result && 'error' in result ? result.error : 'Failed to extract ProductHunt results'
      };
    }
  } catch (error) {
    console.error('Error scraping ProductHunt search:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}; 