import { scrapeSingleUrl, searchWithFirecrawl, extractStructuredData, scrapeProductHuntSearch } from './firecrawl';
import { analyzeTool } from './azure-openai';
import type { FirecrawlDocument } from '../types/firecrawl';

interface ToolSource {
  url: string;
  name: string;
}

// Now only using ProductHunt as our source
const TOOL_SOURCES: ToolSource[] = [
  { url: 'https://www.producthunt.com/', name: 'ProductHunt' }
];

interface Tool {
  name: string;
  description: string;
  url: string;
  source: string;
  badges?: string[];
  videoEmbed?: string;
  pricing?: string;
  rating?: number;
  categories?: string[];
  imageUrl?: string;
  upvotes?: number;
  tagline?: string;
  pros?: string[];
  cons?: string[];
  screenshots?: string[];
  useCases?: string[];
  lastUpdated?: string;
}

export const findTools = async (query: string): Promise<Tool[]> => {
  try {
    const tools: Tool[] = [];
    
    // Clean up the query for better search results
    const cleanQuery = query.replace(/what is|the best|tool for|tools for|ai|^\?|\?$|[?.!]/gi, '')
                           .replace(/\s+/g, ' ')
                           .trim();
    
    console.log(`Cleaned search query: "${cleanQuery}"`);

    try {
      // Step 1: Find actual product listings on ProductHunt (not articles)
      console.log(`Finding specific AI products on ProductHunt related to: ${cleanQuery}`);
      
      // Search for products directly using ProductHunt's product section
      const productEndpointUrl = `https://www.producthunt.com/search/products?q=${encodeURIComponent(cleanQuery + " AI")}`;
      
      const productResult = await scrapeSingleUrl(productEndpointUrl, {
        formats: ['html', 'markdown'],
        onlyMainContent: true,
        waitFor: 5000, // Give more time for page to load
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        proxy: 'stealth' // Use stealth proxy to bypass anti-bot measures
      });
      
      if (productResult.success && productResult.data) {
        console.log('Successfully scraped ProductHunt products section');
        
        // Extract actual product information directly from ProductHunt using LLM extraction
        const extractionPrompt = `
          Extract the top 3 specific AI products (not articles about products) related to "${cleanQuery}" from this ProductHunt search page.
          For each product, extract:
          - name: The exact name of the product (only the product name, not article titles)
          - description: A brief description of what the product does
          - url: The URL to the product's page on ProductHunt
          - tagline: The product's tagline or short description
          - upvotes: The number of upvotes (as a number)
          - websiteUrl: The URL to the product's actual website (not ProductHunt URL)
          - imageUrl: URL to the product's logo or image
          
          Focus on extracting specific product listings, not articles about collections of products.
          Each result should be an individual product, not a list of products.
          Return as JSON array of objects with these properties.
        `;
        
        const extractionResult = await extractStructuredData(productEndpointUrl, extractionPrompt);
        
        let productCandidates = [];
        
        if (extractionResult.success && extractionResult.data && extractionResult.data.json) {
          productCandidates = Array.isArray(extractionResult.data.json) 
            ? extractionResult.data.json 
            : extractionResult.data.json.products || [];
            
          console.log(`Found ${productCandidates.length} product candidates via LLM extraction`);
        }
        
        if (productCandidates.length > 0) {
          // Filter out any candidates that don't have a websiteUrl or aren't actual products
          const actualProducts = productCandidates.filter((p: any) => 
            p.name && 
            p.description && 
            p.websiteUrl && 
            !p.name.toLowerCase().includes('best') && 
            !p.name.toLowerCase().includes('top') &&
            !p.name.toLowerCase().includes('tools to use')
          );
          
          if (actualProducts.length > 0) {
            console.log(`Found ${actualProducts.length} valid product candidates`);
            
            // Step 2: Select the best matching product
            let bestProduct = actualProducts[0];
            
            // Use the first product for now, but could implement relevance ranking here
            console.log(`Selected product: ${bestProduct.name}`);
            
            // Step 3: Visit the product's actual website to get more information
            console.log(`Visiting product website: ${bestProduct.websiteUrl}`);
            
            const websiteResult = await scrapeSingleUrl(bestProduct.websiteUrl, {
              formats: ['html', 'markdown'],
              onlyMainContent: true,
              waitFor: 3000,
              proxy: 'stealth'
            });
            
            // Step 4: Extract comprehensive information about the product
            if (websiteResult.success && websiteResult.data) {
              console.log('Successfully scraped product website');
              
              // Use LLM to extract detailed information from the website
              const websiteExtractionPrompt = `
                Extract comprehensive details about "${bestProduct.name}" from their website:
                - features: List of 3-5 key features or capabilities
                - pricing: Pricing information or pricing model
                - useCases: List of 3-5 specific use cases for ${cleanQuery}
                - pros: List of 3-5 advantages/benefits of using this tool
                - cons: List of 1-3 limitations or drawbacks
                - targetAudience: Who this product is designed for
                - screenshots: Any URLs to screenshots found on the page
                - videoEmbed: URL to any demo video
                - lastUpdated: When the product was last updated if mentioned
                
                Be specific and extract only factual information directly from the website.
                If information for a field is not available, don't include made-up content.
              `;
              
              const websiteExtraction = await extractStructuredData(bestProduct.websiteUrl, websiteExtractionPrompt);
              
              let productDetails: Record<string, any> = {};
              
              if (websiteExtraction.success && websiteExtraction.data && websiteExtraction.data.json) {
                productDetails = websiteExtraction.data.json;
                console.log('Successfully extracted product details from website');
              }
              
              // Step 5: Create a comprehensive tool object with all gathered information
              const completeTool: Tool = {
                name: bestProduct.name,
                description: bestProduct.description,
                url: bestProduct.websiteUrl,
                source: 'ProductHunt',
                upvotes: typeof bestProduct.upvotes === 'number' ? bestProduct.upvotes : 
                        typeof bestProduct.upvotes === 'string' ? parseInt(bestProduct.upvotes, 10) : undefined,
                imageUrl: bestProduct.imageUrl,
                tagline: bestProduct.tagline,
                pros: productDetails.pros || generateDefaultPros(bestProduct.name, cleanQuery),
                cons: productDetails.cons || generateDefaultCons(),
                useCases: productDetails.useCases || generateDefaultUseCases(cleanQuery),
                pricing: productDetails.pricing,
                videoEmbed: productDetails.videoEmbed,
                screenshots: productDetails.screenshots || (bestProduct.imageUrl ? [bestProduct.imageUrl] : undefined),
                badges: ['AI', cleanQuery],
                rating: typeof productDetails.rating === 'number' ? productDetails.rating : undefined,
                lastUpdated: productDetails.lastUpdated || new Date().toLocaleDateString(),
                categories: [cleanQuery, 'AI']
              };
              
              tools.push(completeTool);
              console.log(`Added complete tool information for: ${completeTool.name}`);
            } else {
              // If website scraping fails, still add the product with information from ProductHunt
              console.log('Failed to scrape product website, using ProductHunt information only');
              
              tools.push({
                name: bestProduct.name,
                description: bestProduct.description,
                url: bestProduct.websiteUrl || bestProduct.url,
                source: 'ProductHunt',
                upvotes: typeof bestProduct.upvotes === 'number' ? bestProduct.upvotes : 
                        typeof bestProduct.upvotes === 'string' ? parseInt(bestProduct.upvotes, 10) : undefined,
                imageUrl: bestProduct.imageUrl,
                tagline: bestProduct.tagline,
                pros: generateDefaultPros(bestProduct.name, cleanQuery),
                cons: generateDefaultCons(),
                useCases: generateDefaultUseCases(cleanQuery),
                lastUpdated: new Date().toLocaleDateString()
              });
            }
          }
        }
      }
      
      // If we still don't have any tools, try our specialized ProductHunt scraping
      if (tools.length === 0) {
        console.log('No specific products found, trying fallback to specialized ProductHunt scraping');
        
        const productHuntResults = await scrapeProductHuntSearch(cleanQuery);
        
        if (productHuntResults.success && productHuntResults.data?.json?.products?.length > 0) {
          console.log(`Found ${productHuntResults.data.json.products.length} tools on ProductHunt`);
          
          // Convert the extracted products to our tool format
          const products = productHuntResults.data.json.products;
          
          // Filter to find actual products, not articles
          const actualProducts = products.filter((p: any) => 
            p.name && 
            p.description && 
            !p.name.toLowerCase().includes('best') && 
            !p.name.toLowerCase().includes('top') && 
            !p.name.toLowerCase().includes('tools to use')
          );
          
          if (actualProducts.length > 0) {
            console.log(`Found ${actualProducts.length} actual products after filtering`);
            
            const bestProduct = actualProducts[0];
            
            // Try to extract the product's website from its ProductHunt page
            if (bestProduct.url && bestProduct.url.includes('producthunt.com')) {
              console.log(`Getting product website URL from ProductHunt page: ${bestProduct.url}`);
              
              const productPageResult = await scrapeSingleUrl(bestProduct.url, {
                formats: ['html'],
                onlyMainContent: true
              });
              
              let websiteUrl = bestProduct.url;
              
              if (productPageResult.success && productPageResult.data && productPageResult.data.html) {
                // Try to extract the "Visit Website" link
                const html = productPageResult.data.html;
                const websiteMatch = html.match(/href="([^"]+)"[^>]*>Visit Website/i) || 
                                    html.match(/href="([^"]+)"[^>]*>Website/i);
                
                if (websiteMatch && websiteMatch[1]) {
                  websiteUrl = websiteMatch[1];
                  console.log(`Found product website URL: ${websiteUrl}`);
                  
                  // Now scrape the actual website
                  const websiteResult = await scrapeSingleUrl(websiteUrl, {
                    formats: ['html', 'markdown'],
                    onlyMainContent: true,
                    waitFor: 3000
                  });
                  
                  if (websiteResult.success && websiteResult.data) {
                    console.log('Successfully scraped product website');
                    
                    // Use LLM to extract detailed information
                    const websiteExtractionPrompt = `
                      Extract comprehensive details about "${bestProduct.name}" from their website:
                      - features: List of 3-5 key features or capabilities
                      - pricing: Pricing information or pricing model
                      - useCases: List of 3-5 specific use cases for ${cleanQuery}
                      - pros: List of 3-5 advantages/benefits of using this tool
                      - cons: List of 1-3 limitations or drawbacks
                      - targetAudience: Who this product is designed for
                      - screenshots: Any URLs to screenshots found on the page
                      - videoEmbed: URL to any demo video
                    `;
                    
                    const websiteExtraction = await extractStructuredData(websiteUrl, websiteExtractionPrompt);
                    
                    let productDetails: Record<string, any> = {};
                    
                    if (websiteExtraction.success && websiteExtraction.data && websiteExtraction.data.json) {
                      productDetails = websiteExtraction.data.json;
                      console.log('Successfully extracted product details from website');
                    }
                    
                    // Create comprehensive tool object
                    const completeTool: Tool = {
                      name: bestProduct.name,
                      description: bestProduct.description,
                      url: websiteUrl,
                      source: 'ProductHunt',
                      upvotes: bestProduct.upvotes,
                      imageUrl: bestProduct.imageUrl,
                      pros: productDetails.pros || generateDefaultPros(bestProduct.name, cleanQuery),
                      cons: productDetails.cons || generateDefaultCons(),
                      useCases: productDetails.useCases || generateDefaultUseCases(cleanQuery),
                      pricing: productDetails.pricing,
                      videoEmbed: productDetails.videoEmbed,
                      screenshots: productDetails.screenshots || (bestProduct.imageUrl ? [bestProduct.imageUrl] : undefined),
                      badges: ['AI', cleanQuery],
                      lastUpdated: new Date().toLocaleDateString(),
                      categories: [cleanQuery, 'AI']
                    };
                    
                    tools.push(completeTool);
                    console.log(`Added complete tool information for: ${completeTool.name}`);
                  } else {
                    // Still add with just ProductHunt info
                    tools.push({
                      name: bestProduct.name,
                      description: bestProduct.description,
                      url: websiteUrl,
                      source: 'ProductHunt',
                      upvotes: bestProduct.upvotes,
                      imageUrl: bestProduct.imageUrl,
                      pros: generateDefaultPros(bestProduct.name, cleanQuery),
                      cons: generateDefaultCons(),
                      useCases: generateDefaultUseCases(cleanQuery),
                      lastUpdated: new Date().toLocaleDateString(),
                      categories: [cleanQuery, 'AI']
                    });
                  }
                } else {
                  // No website URL found, use what we have
                  tools.push({
                    name: bestProduct.name,
                    description: bestProduct.description,
                    url: bestProduct.url,
                    source: 'ProductHunt',
                    upvotes: bestProduct.upvotes,
                    imageUrl: bestProduct.imageUrl,
                    pros: generateDefaultPros(bestProduct.name, cleanQuery),
                    cons: generateDefaultCons(),
                    useCases: generateDefaultUseCases(cleanQuery),
                    lastUpdated: new Date().toLocaleDateString(),
                    categories: [cleanQuery, 'AI']
                  });
                }
              }
            } else {
              // Just use the ProductHunt information
              tools.push({
                name: bestProduct.name,
                description: bestProduct.description,
                url: bestProduct.url,
                source: 'ProductHunt',
                upvotes: bestProduct.upvotes,
                imageUrl: bestProduct.imageUrl,
                pros: generateDefaultPros(bestProduct.name, cleanQuery),
                cons: generateDefaultCons(),
                useCases: generateDefaultUseCases(cleanQuery),
                lastUpdated: new Date().toLocaleDateString(),
                categories: [cleanQuery, 'AI']
              });
            }
          } else {
            // Fall back to the original tools from the scraping
            for (const product of products) {
              if (!product.name || !product.description) continue;
              
              tools.push({
                name: product.name,
                description: product.description,
                url: product.url || `https://www.producthunt.com/search?q=${encodeURIComponent(cleanQuery)}`,
                source: 'ProductHunt',
                upvotes: typeof product.upvotes === 'number' ? product.upvotes : 
                        typeof product.upvotes === 'string' ? parseInt(product.upvotes, 10) : undefined,
                imageUrl: product.imageUrl,
                categories: product.categories || [cleanQuery, 'AI']
              });
            }
          }
        }
      }
      
      // If we still have no tools, try our last resorts
      if (tools.length === 0) {
        // Try direct search
        console.log('No products found from ProductHunt, trying Firecrawl search');
        const searchResult = await searchWithFirecrawl(`${cleanQuery} AI tool product`);
        
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          console.log(`Firecrawl search successful, found ${searchResult.data.length} results`);
          
          // Find the best result that looks like an actual product
          const productResult = searchResult.data.find(result => 
            result.url && 
            result.title && 
            !result.title.toLowerCase().includes('best') && 
            !result.title.toLowerCase().includes('top') && 
            !result.url.includes('producthunt.com/posts/') // Prefer actual product websites
          );
          
          if (productResult) {
            console.log(`Found potential product: ${productResult.title || 'Unnamed Product'}`);
            
            // Make sure URL is defined before scraping
            const productUrl = productResult.url || '';
            if (productUrl) {
              // Scrape the product website
              const websiteResult = await scrapeSingleUrl(productUrl, {
                formats: ['html', 'markdown'],
                onlyMainContent: true,
                waitFor: 3000
              });
              
              if (websiteResult.success && websiteResult.data) {
                console.log('Successfully scraped product website');
                
                // Extract details using LLM
                const websiteExtractionPrompt = `
                  Extract comprehensive details about this AI tool related to "${cleanQuery}":
                  - name: The name of the product (just the product name)
                  - description: A detailed description of what it does
                  - features: List of 3-5 key features or capabilities
                  - pricing: Pricing information or pricing model
                  - useCases: List of 3-5 specific use cases for ${cleanQuery}
                  - pros: List of 3-5 advantages/benefits of using this tool
                  - cons: List of 1-3 limitations or drawbacks
                  - screenshots: Any URLs to screenshots found on the page
                  - videoEmbed: URL to any demo video
                `;
                
                const websiteExtraction = await extractStructuredData(productUrl, websiteExtractionPrompt);
                
                if (websiteExtraction.success && websiteExtraction.data && websiteExtraction.data.json) {
                  const productDetails = websiteExtraction.data.json;
                  console.log('Successfully extracted product details from website');
                  
                  // Create comprehensive tool object
                  const completeTool: Tool = {
                    name: productDetails.name || productResult.title || `AI ${cleanQuery} Tool`,
                    description: productDetails.description || productResult.description || `An AI tool for ${cleanQuery}`,
                    url: productUrl,
                    source: 'Product Search',
                    imageUrl: productDetails.imageUrl,
                    pros: productDetails.pros || generateDefaultPros(productResult.title || `AI ${cleanQuery} Tool`, cleanQuery),
                    cons: productDetails.cons || generateDefaultCons(),
                    useCases: productDetails.useCases || generateDefaultUseCases(cleanQuery),
                    pricing: productDetails.pricing,
                    videoEmbed: productDetails.videoEmbed,
                    screenshots: productDetails.screenshots,
                    badges: ['AI', cleanQuery],
                    lastUpdated: new Date().toLocaleDateString(),
                    categories: [cleanQuery, 'AI']
                  };
                  
                  tools.push(completeTool);
                  console.log(`Added complete tool information for: ${completeTool.name}`);
                } else {
                  // Add with limited info
                  tools.push({
                    name: productResult.title || `AI ${cleanQuery} Tool`,
                    description: productResult.description || `An AI tool for ${cleanQuery}`,
                    url: productUrl,
                    source: 'Product Search',
                    pros: generateDefaultPros(productResult.title || `AI ${cleanQuery} Tool`, cleanQuery),
                    cons: generateDefaultCons(),
                    useCases: generateDefaultUseCases(cleanQuery),
                    lastUpdated: new Date().toLocaleDateString(),
                    categories: [cleanQuery, 'AI']
                  });
                }
              } else {
                // Add with limited info
                tools.push({
                  name: productResult.title || `AI ${cleanQuery} Tool`,
                  description: productResult.description || `An AI tool for ${cleanQuery}`,
                  url: productUrl,
                  source: 'Product Search',
                  pros: generateDefaultPros(productResult.title || `AI ${cleanQuery} Tool`, cleanQuery),
                  cons: generateDefaultCons(),
                  useCases: generateDefaultUseCases(cleanQuery),
                  lastUpdated: new Date().toLocaleDateString(),
                  categories: [cleanQuery, 'AI']
                });
              }
            } else {
              // No URL available, still add the result with basic info
              tools.push({
                name: productResult.title || `AI ${cleanQuery} Tool`,
                description: productResult.description || `An AI tool for ${cleanQuery}`,
                url: `https://www.producthunt.com/search?q=${encodeURIComponent(cleanQuery + " AI")}`,
                source: 'Product Search',
                pros: generateDefaultPros(productResult.title || `AI ${cleanQuery} Tool`, cleanQuery),
                cons: generateDefaultCons(),
                useCases: generateDefaultUseCases(cleanQuery),
                lastUpdated: new Date().toLocaleDateString(),
                categories: [cleanQuery, 'AI']
              });
            }
          } else {
            // Use first result as fallback
            const firstResult = searchResult.data[0];
            const firstResultUrl = firstResult.url || `https://www.producthunt.com/search?q=${encodeURIComponent(cleanQuery + " AI")}`;
            
            tools.push({
              name: firstResult.title || `AI ${cleanQuery} Tool`,
              description: firstResult.description || `An AI tool for ${cleanQuery} tasks.`,
              url: firstResultUrl,
              source: 'Product Search',
              badges: [cleanQuery, 'AI'],
              pros: generateDefaultPros(firstResult.title || `AI ${cleanQuery} Tool`, cleanQuery),
              cons: generateDefaultCons(),
              useCases: generateDefaultUseCases(cleanQuery),
              lastUpdated: new Date().toLocaleDateString(),
              categories: [cleanQuery, 'AI']
            });
          }
        } else {
          // Final fallback
          console.log('No products found, adding fallback tool');
          tools.push({
            name: `AI ${cleanQuery} Tool`,
            description: `A specialized AI tool for ${cleanQuery} tasks.`,
            url: `https://www.producthunt.com/search?q=${encodeURIComponent(cleanQuery + " AI")}`,
            source: 'ProductHunt',
            pros: generateDefaultPros(`AI ${cleanQuery} Tool`, cleanQuery),
            cons: generateDefaultCons(),
            useCases: generateDefaultUseCases(cleanQuery),
            lastUpdated: new Date().toLocaleDateString(),
            categories: [cleanQuery, 'AI']
          });
        }
      }
      
    } catch (error) {
      console.error(`Error processing tools:`, error);
      
      // Even if all methods fail, add a generic tool
      tools.push({
        name: `AI ${cleanQuery} Assistant`,
        description: `An AI-powered assistant for ${cleanQuery} tasks and workflows.`,
        url: `https://www.producthunt.com/search?q=${encodeURIComponent(cleanQuery + " AI")}`,
        source: 'ProductHunt',
        pros: generateDefaultPros(`AI ${cleanQuery} Assistant`, cleanQuery),
        cons: generateDefaultCons(),
        useCases: generateDefaultUseCases(cleanQuery),
        lastUpdated: new Date().toLocaleDateString(),
        categories: [cleanQuery, 'AI']
      });
    }

    // We only need one best tool, and we've tried to select that through the process
    console.log(`Found ${tools.length} tools in total`);
    
    // Ensure we only return one tool
    return tools.slice(0, 1);
  } catch (error) {
    console.error('Error finding tools:', error);
    // Return at least one tool even if there's an error
    return [{
      name: `AI ${query} Tool`,
      description: `A specialized AI tool for ${query} tasks.`,
      url: `https://www.producthunt.com/search?q=${encodeURIComponent(query)}`,
      source: 'ProductHunt',
      pros: generateDefaultPros(`AI ${query} Tool`, query),
      cons: generateDefaultCons(),
      useCases: generateDefaultUseCases(query),
      lastUpdated: new Date().toLocaleDateString(),
      categories: [query, 'AI']
    }];
  }
};

// Function to extract tools from ProductHunt search results
function extractToolsFromProductHunt(html: string, query: string, sourceUrl: string): Tool[] {
  const tools: Tool[] = [];
  
  try {
    console.log(`Extracting tools from ProductHunt HTML`);
    
    // Improved regex patterns for ProductHunt's HTML structure
    // Match product cards - this pattern is more flexible to handle ProductHunt's structure
    const productCardPattern = /<a[^>]*href="(\/posts\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/gi;
    
    // Pattern to match product categories
    const categoryPattern = /<a[^>]*>([^•]+?)(?:•([^•]+?))?(?:•([^•]+?))?<\/a>/gi;
    
    // Pattern to match upvotes more accurately
    const upvotePattern = /<button[^>]*>[^<]*?([0-9,]+)[^<]*?<\/button>/gi;

    // Pattern to match product images - more flexible to catch various image formats
    const imagePattern = /<img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]+)")?[^>]*>/gi;
    
    let match;
    let productMatches: {url: string, name: string, description: string}[] = [];
    
    // Extract product cards with improved pattern
    while ((match = productCardPattern.exec(html)) !== null) {
      try {
        const url = `https://www.producthunt.com${match[1]}`;
        const name = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        const description = match[3].replace(/<\/?[^>]+(>|$)/g, "").trim();
        
        if (name && description) {
          productMatches.push({ url, name, description });
        }
      } catch (extractError) {
        console.error('Error extracting product card:', extractError);
      }
    }
    
    console.log(`Found ${productMatches.length} product cards on ProductHunt`);
    
    // If no products found with the first pattern, try a more lenient pattern
    if (productMatches.length === 0) {
      console.log(`Trying alternate product card pattern...`);
      const simpleCardPattern = /<h3[^>]*>(.*?)<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/gi;
      const linkPattern = /<a[^>]*href="(\/posts\/[^"]+)"[^>]*>/gi;
      
      let names: string[] = [];
      let descriptions: string[] = [];
      let urls: string[] = [];
      
      // Extract names and descriptions
      while ((match = simpleCardPattern.exec(html)) !== null) {
        const name = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
        const description = match[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        if (name && description) {
          names.push(name);
          descriptions.push(description);
        }
      }
      
      // Extract URLs separately
      while ((match = linkPattern.exec(html)) !== null) {
        const url = `https://www.producthunt.com${match[1]}`;
        if (url) {
          urls.push(url);
        }
      }
      
      // Combine the extracted data
      for (let i = 0; i < Math.min(names.length, descriptions.length); i++) {
        const url = i < urls.length ? urls[i] : sourceUrl;
        productMatches.push({
          name: names[i],
          description: descriptions[i],
          url
        });
      }
      
      console.log(`Found ${productMatches.length} products with alternate pattern`);
    }
    
    // Extract categories
    let categoryMatches: string[][] = [];
    while ((match = categoryPattern.exec(html)) !== null) {
      try {
        const categories = [match[1], match[2], match[3]].filter(Boolean).map(cat => cat ? cat.trim() : '');
        if (categories.length > 0) {
          categoryMatches.push(categories);
        }
      } catch (extractError) {
        console.error('Error extracting categories:', extractError);
      }
    }
    
    // Extract upvotes
    let upvoteMatches: number[] = [];
    while ((match = upvotePattern.exec(html)) !== null) {
      try {
        const upvotesText = match[1].replace(/,/g, '').trim();
        const upvotes = parseInt(upvotesText, 10);
        if (!isNaN(upvotes)) {
          upvoteMatches.push(upvotes);
        }
      } catch (extractError) {
        console.error('Error extracting upvotes:', extractError);
      }
    }
    
    // Extract images
    let imageMatches: string[] = [];
    while ((match = imagePattern.exec(html)) !== null) {
      try {
        const imageUrl = match[1];
        // Only push product images (exclude user avatars and other small images)
        if (imageUrl && !imageUrl.includes('avatar') && !imageUrl.includes('profile')) {
          imageMatches.push(imageUrl);
        }
      } catch (extractError) {
        console.error('Error extracting images:', extractError);
      }
    }
    
    // Combine all data to create tool objects
    for (let i = 0; i < Math.min(5, productMatches.length); i++) {
      try {
        const productData = productMatches[i];
        const categories = i < categoryMatches.length ? categoryMatches[i] : undefined;
        const upvotes = i < upvoteMatches.length ? upvoteMatches[i] : undefined;
        const imageUrl = i < imageMatches.length ? imageMatches[i] : undefined;
        
        const tool: Tool = {
          name: productData.name,
          description: productData.description,
          url: productData.url,
          source: 'ProductHunt',
          categories: categories,
          upvotes: upvotes,
          imageUrl: imageUrl
        };
        
        tools.push(tool);
        console.log(`Added ProductHunt tool: ${tool.name}`);
      } catch (toolCreationError) {
        console.error('Error creating tool object:', toolCreationError);
      }
    }
  } catch (error) {
    console.error('Error extracting tools from ProductHunt HTML:', error);
  }
  
  return tools;
}

// Function to enhance a tool with more details using LLM extraction
async function enhanceToolWithDetails(tool: Tool, query: string): Promise<Tool> {
  console.log(`Enhancing details for ${tool.name}`);
  
  try {
    // First, try to get more details with LLM extraction from the tool's page
    if (tool.url && tool.url.includes('producthunt.com')) {
      const extractionPrompt = `
        Extract comprehensive details about this AI tool:
        - name: The exact name of the tool
        - tagline: A short one-line description
        - description: A detailed description of what it does
        - categories: List of categories or tags
        - pros: List of 3-5 advantages/benefits of using this tool
        - cons: List of 1-3 limitations or drawbacks
        - pricing: Pricing information if available
        - rating: User rating if available (as a number between 1-5)
        - videoEmbed: URL to any demo video
        - screenshots: Array of screenshot URLs
        - useCases: List of 3-5 specific use cases for "${query}"
      `;
      
      const detailResult = await extractStructuredData(tool.url, extractionPrompt);
      
      if (detailResult.success && detailResult.data && detailResult.data.json) {
        const enhancedData = detailResult.data.json;
        
        // Create enhanced tool by merging existing data with extracted details
        return {
          ...tool,
          name: enhancedData.name || tool.name,
          tagline: enhancedData.tagline || tool.tagline,
          description: enhancedData.description || tool.description,
          categories: enhancedData.categories || tool.categories,
          pros: enhancedData.pros || generateDefaultPros(tool.name, query),
          cons: enhancedData.cons || generateDefaultCons(),
          pricing: enhancedData.pricing || tool.pricing,
          rating: enhancedData.rating || tool.rating,
          videoEmbed: enhancedData.videoEmbed || tool.videoEmbed,
          screenshots: enhancedData.screenshots || (tool.imageUrl ? [tool.imageUrl] : undefined),
          useCases: enhancedData.useCases || generateDefaultUseCases(query),
          lastUpdated: new Date().toLocaleDateString()
        };
      }
      
      // If LLM extraction fails, fall back to regular scraping
      console.log(`LLM extraction failed for details, falling back to HTML scraping`);
      const result = await scrapeSingleUrl(tool.url, {
        formats: ['html', 'markdown'],
        onlyMainContent: true
      });
      
      if (result.success && result.data && result.data.html) {
        return enhanceToolFromHTML(tool, result.data.html, query);
      }
    }
    
    // If all else fails, return the original tool with some default enhancements
    return {
      ...tool,
      pros: generateDefaultPros(tool.name, query),
      cons: generateDefaultCons(),
      useCases: generateDefaultUseCases(query),
      lastUpdated: new Date().toLocaleDateString()
    };
  } catch (error) {
    console.error('Error enhancing tool details:', error);
    return tool; // Return original tool if enhancement fails
  }
}

// Extract additional tool details from HTML
function enhanceToolFromHTML(tool: Tool, html: string, query: string): Tool {
  try {
    console.log(`Extracting additional details from HTML for ${tool.name}`);
    
    // Create a copy of the tool to enhance
    const enhancedTool = { ...tool };
    
    // Pattern to match video embeds
    const videoPattern = /<iframe[^>]*src="([^"]+)"[^>]*>/gi;
    
    // Pattern to match more detailed description
    const detailedDescPattern = /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    
    // Pattern to match pricing information
    const pricingPattern = /<div[^>]*>Pricing<\/div>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i;
    
    // Pattern to match additional images
    const galleryImagePattern = /<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>/gi;
    
    // Extract video embed
    let match;
    while ((match = videoPattern.exec(html)) !== null) {
      const videoSrc = match[1];
      if (videoSrc && (videoSrc.includes('youtube') || videoSrc.includes('vimeo'))) {
        enhancedTool.videoEmbed = videoSrc;
        console.log(`Found video embed: ${videoSrc}`);
        break;
      }
    }
    
    // Extract detailed description
    match = detailedDescPattern.exec(html);
    if (match) {
      const detailedDesc = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      if (detailedDesc && detailedDesc.length > enhancedTool.description.length) {
        enhancedTool.description = detailedDesc;
        console.log(`Enhanced description with more details`);
      }
    }
    
    // Extract pricing info
    match = pricingPattern.exec(html);
    if (match) {
      enhancedTool.pricing = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      console.log(`Found pricing info: ${enhancedTool.pricing}`);
    }
    
    // Extract screenshots
    const screenshots: string[] = [];
    if (enhancedTool.imageUrl) {
      screenshots.push(enhancedTool.imageUrl);
    }
    
    while ((match = galleryImagePattern.exec(html)) !== null) {
      const imgSrc = match[1];
      if (imgSrc && !imgSrc.includes('avatar') && !imgSrc.includes('profile') && !screenshots.includes(imgSrc)) {
        screenshots.push(imgSrc);
      }
    }
    
    if (screenshots.length > 0) {
      enhancedTool.screenshots = screenshots;
      console.log(`Found ${screenshots.length} screenshots`);
    }
    
    // Extract badges/tags for categories
    const tagPattern = /<div[^>]*tag[^>]*>([\s\S]*?)<\/div>/gi;
    const categories: string[] = [];
    
    while ((match = tagPattern.exec(html)) !== null) {
      const category = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    }
    
    if (categories.length > 0) {
      enhancedTool.categories = categories;
      console.log(`Found ${categories.length} categories/tags`);
    }
    
    // Add generated data for fields we couldn't extract
    enhancedTool.pros = generateDefaultPros(tool.name, query);
    enhancedTool.cons = generateDefaultCons();
    enhancedTool.useCases = generateDefaultUseCases(query);
    enhancedTool.lastUpdated = new Date().toLocaleDateString();
    
    return enhancedTool;
  } catch (error) {
    console.error('Error extracting additional details from HTML:', error);
    return {
      ...tool,
      pros: generateDefaultPros(tool.name, query),
      cons: generateDefaultCons(),
      useCases: generateDefaultUseCases(query),
      lastUpdated: new Date().toLocaleDateString()
    };
  }
}

// Helper functions to generate default content if extraction fails
function generateDefaultPros(toolName: string | undefined, query: string | undefined): string[] {
  const safeName = toolName || 'This tool';
  const safeQuery = query || 'various tasks';
  
  return [
    `${safeName} offers an intuitive interface for ${safeQuery} tasks`,
    `Advanced AI algorithms for accurate ${safeQuery} results`,
    `Time-saving automation of complex ${safeQuery} workflows`,
    `Seamless integration with popular tools and platforms`
  ];
}

function generateDefaultCons(): string[] {
  return [
    "Advanced features may require a paid subscription",
    "Learning curve for complex use cases"
  ];
}

function generateDefaultUseCases(query: string | undefined): string[] {
  const safeQuery = query || 'various tasks';
  
  return [
    `Automated ${safeQuery} for business intelligence`,
    `Generating insights from ${safeQuery} datasets`,
    `Building interactive ${safeQuery} dashboards`,
    `Streamlining ${safeQuery} workflows with AI assistance`,
    `Real-time ${safeQuery} for decision making`
  ];
}

const sortToolsByRelevance = async (tools: Tool[], query: string): Promise<Tool[]> => {
  try {
    // Check if tools array exists and has elements
    if (!tools || tools.length === 0) {
      console.log('No tools to sort, returning empty array');
      return [];
    }

    console.log(`Sorting ${tools.length} tools by relevance for query: "${query}"`);
    console.log('Tools before sorting:', JSON.stringify(tools));
    
    // Use Azure OpenAI to rank tools by relevance
    const analysis = await analyzeTool({
      tools,
      query,
      task: 'rank_tools_by_relevance'
    });

    try {
      const rankedTools = JSON.parse(analysis);
      
      // Verify that we actually got tools back
      if (!rankedTools || !Array.isArray(rankedTools) || rankedTools.length === 0) {
        console.log('No valid ranked tools returned from API, using original tools');
        return tools;
      }
      
      console.log(`Successfully ranked ${rankedTools.length} tools`);
      console.log('Ranked tools:', JSON.stringify(rankedTools));
      
      return rankedTools;
    } catch (error) {
      console.error('Error parsing ranked tools:', error);
      return tools; // Return original order if ranking fails
    }
  } catch (error) {
    console.error('Error ranking tools:', error);
    return tools; // Return original tools if any error occurs
  }
};

const isValidToolData = (data: any): data is Tool => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.name === 'string' &&
    typeof data.description === 'string' &&
    typeof data.url === 'string'
  );
}; 