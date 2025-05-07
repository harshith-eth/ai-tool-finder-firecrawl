import {
  scrapeSingleUrl,
  searchWithFirecrawl,
  extractStructuredData,
  scrapeToolSearch, // Uses FIRE-1 for searching on sites like ProductHunt
  extractToolInfoWithAgent // Uses FIRE-1 for extracting from a specific tool URL
} from './firecrawl';
import { analyzeTool } from './azure-openai';
import type { 
  FirecrawlDocument, 
  ToolPricingTier, 
  FirecrawlScrapeResult, 
  FirecrawlSearchResult 
} from '../types/firecrawl';

// Define the structure for a tool source that the application can use
interface ToolSourceConfig {
  name: string; // e.g., "ProductHunt", "CustomDirectoryX"
  searchFunction?: (query: string) => Promise<FirecrawlScrapeResult | FirecrawlSearchResult>; // Function to search this source
  // If the source is a known directory list (like the GitHub one), specify its URL
  directoryListUrl?: string; 
  // Function to extract individual tool URLs from a directory page
  toolUrlExtractor?: (pageContent: FirecrawlDocument, query: string) => Promise<string[]>; 
}

// This is where users can add more directory configurations
// For now, we will focus on ProductHunt as an example, but this structure is scalable.
const TOOL_SOURCES: ToolSourceConfig[] = [
  {
    name: 'ProductHunt',
    // Use scrapeToolSearch for ProductHunt, as it's designed for such sites
    searchFunction: async (query) => scrapeToolSearch(query, 'producthunt') 
  },
  // Example for a generic website search as a fallback
  {
    name: 'GenericWebSearch',
    searchFunction: async (query) => searchWithFirecrawl(`${query} AI tool`, { 
      pageOptions: { fetchPageContent: true, onlyMainContent: true },
      limit: 5 // Limit generic search results
    })
  }
  // {
  //   name: 'GitHubAIDirectoriesList',
  //   directoryListUrl: 'https://github.com/harshith-eth/ai-directories',
  //   // Users would need to implement a toolUrlExtractor for GitHub, 
  //   // possibly by scraping the markdown or using a simpler approach if the repo offers a structured list.
  //   // toolUrlExtractor: async (pageContent) => { /* ...logic to find tool URLs... */ return []; }
  // },
];

// Interface for the tools our application will work with internally
// This should align with the Tool interface in App.tsx
export interface AppTool {
  name: string;
  description: string;
  url: string;
  source: string; // e.g., "ProductHunt", "GenericWebSearch"
  tagline?: string;
  categories?: string[];
  upvotes?: number;
  features?: string[];
  useCases?: string[];
  pricing?: string | ToolPricingTier[];
  screenshots?: string[];
  videoEmbed?: string;
  pros?: string[];
  cons?: string[];
  lastUpdated?: string;
  badges?: string[];
  rating?: number;
  imageUrl?: string;
  websiteUrl?: string; // For the actual tool website, if different from initial URL
}

/**
 * Main function to find AI tools based on a query.
 * It will try ProductHunt first, then a generic web search if no specific tools are found.
 */
export const findTools = async (query: string): Promise<AppTool[]> => {
  try {
    const cleanQuery = query.replace(/what is|the best|tool for|tools for|ai|\?|\.$|[?.!]/gi, '')
                           .replace(/\s+/g, ' ')
                           .trim();
    console.log(`Cleaned search query: "${cleanQuery}"`);

    let foundRawTools: { name?: string; description?: string; url?: string; sourceName: string; [key: string]: any }[] = [];

    // --- Attempt 1: Search configured tool sources (e.g., ProductHunt) ---
    const productHuntSource = TOOL_SOURCES.find(s => s.name === 'ProductHunt');
    if (productHuntSource && productHuntSource.searchFunction) {
      console.log(`Searching ${productHuntSource.name} for: ${cleanQuery}`);
      const phResult = await productHuntSource.searchFunction(cleanQuery);

      if (phResult.success && phResult.data) {
        const products = (phResult.data as FirecrawlDocument).json?.products || [];
        if (Array.isArray(products) && products.length > 0) {
          console.log(`Found ${products.length} potential tools from ${productHuntSource.name}`);
          products.forEach((p: any) => { // Explicitly type p as any for now, or define a stricter type
            if (p.name && p.url) {
              foundRawTools.push({ ...p, sourceName: productHuntSource.name });
            }
          });
        }
      }
    }

    // --- Attempt 2: Fallback to Generic Web Search if no tools from primary source ---
    if (foundRawTools.length === 0) {
      const genericSearchSource = TOOL_SOURCES.find(s => s.name === 'GenericWebSearch');
      if (genericSearchSource && genericSearchSource.searchFunction) {
        console.log(`No tools from ProductHunt, trying ${genericSearchSource.name} for: ${cleanQuery}`);
        const searchResult = await genericSearchSource.searchFunction(cleanQuery) as FirecrawlSearchResult;
        if (searchResult.success && Array.isArray(searchResult.data)) {
          console.log(`Found ${searchResult.data.length} results from ${genericSearchSource.name}`);
          searchResult.data.forEach((item: FirecrawlDocument) => { // Type item as FirecrawlDocument
            if (item.url && item.title && !item.title.toLowerCase().includes('best') && !item.title.toLowerCase().includes('top')) {
              foundRawTools.push({ 
                name: item.title, 
                description: item.markdown || item.content, 
                url: item.url, 
                sourceName: genericSearchSource.name 
              });
            }
          });
        }
      }
    }
    
    if (foundRawTools.length === 0) {
      console.log("No tools found from any source. Creating a fallback.");
      return [createFallbackTool(cleanQuery, "NoSource")];
    }

    // --- Process and Enhance Found Tools ---
    const processedTools: AppTool[] = [];
    // Limit to processing a few raw tools to manage API calls and time
    const toolsToProcess = foundRawTools.slice(0, 3);

    for (const rawTool of toolsToProcess) {
      const initialUrl = rawTool.url;
      if (!initialUrl) continue;

      console.log(`Processing tool: ${rawTool.name || initialUrl} from ${rawTool.sourceName}`);
      let detailedToolInfo: Partial<AppTool> = { 
        name: rawTool.name,
        description: rawTool.description,
        url: initialUrl,
        source: rawTool.sourceName,
        tagline: rawTool.tagline,
        upvotes: typeof rawTool.upvotes === 'number' ? rawTool.upvotes : undefined,
        imageUrl: rawTool.imageUrl,
        categories: Array.isArray(rawTool.categories) ? rawTool.categories : (rawTool.category ? [rawTool.category] : []),
        websiteUrl: initialUrl // Initialize websiteUrl with the initial URL
      };

      // Use FIRE-1 agent to extract detailed info from the tool's actual website
      // This is preferred over relying solely on directory data
      const agentExtractionResult = await extractToolInfoWithAgent(initialUrl);
      if (agentExtractionResult.success && agentExtractionResult.data?.json) {
        console.log(`Successfully extracted details for ${rawTool.name || initialUrl} using FIRE-1`);
        const agentData = agentExtractionResult.data.json;
        detailedToolInfo = {
          ...detailedToolInfo,
          name: agentData.name || detailedToolInfo.name,
          description: agentData.description || detailedToolInfo.description,
          tagline: agentData.tagline || detailedToolInfo.tagline,
          features: agentData.features || [],
          useCases: agentData.useCases || [],
          pros: agentData.pros || [],
          cons: agentData.cons || [],
          pricing: agentData.pricing,
          websiteUrl: agentData.websiteUrl || initialUrl, // Update with agentData.websiteUrl if found
          imageUrl: agentData.imageUrl || detailedToolInfo.imageUrl,
          videoEmbed: agentData.videoUrl,
          categories: agentData.categories || detailedToolInfo.categories,
        };
      } else {
        console.warn(`FIRE-1 extraction failed for ${initialUrl}. Relying on initial data.`);
        // If agent fails, try to fill with OpenAI enhancement if crucial data is missing
        if (!detailedToolInfo.features || !detailedToolInfo.useCases) {
          const enhancedByOpenAI = await analyzeTool({
            task: 'enhance_tool_details',
            tool: detailedToolInfo,
            query: cleanQuery
          });
          try {
            const parsedEnhancement = JSON.parse(enhancedByOpenAI);
            detailedToolInfo = { ...detailedToolInfo, ...parsedEnhancement };
          } catch (e) { console.error("Failed to parse OpenAI enhancement", e); }
        }
      }
      
      // Ensure essential fields are present, provide defaults if necessary
      const finalTool: AppTool = {
        name: detailedToolInfo.name || "Unnamed AI Tool",
        description: detailedToolInfo.description || `An AI tool for ${cleanQuery}. Visit the website to learn more.`,
        url: detailedToolInfo.websiteUrl || initialUrl, // Use websiteUrl if available, else fallback to initial URL
        source: detailedToolInfo.source || rawTool.sourceName,
        tagline: detailedToolInfo.tagline,
        categories: detailedToolInfo.categories?.length ? detailedToolInfo.categories : [cleanQuery, "AI"],
        upvotes: detailedToolInfo.upvotes,
        features: detailedToolInfo.features?.length ? detailedToolInfo.features : generateDefaultFeatures(detailedToolInfo.name || "tool", cleanQuery),
        useCases: detailedToolInfo.useCases?.length ? detailedToolInfo.useCases : generateDefaultUseCases(cleanQuery),
        pricing: detailedToolInfo.pricing || "Check website",
        screenshots: detailedToolInfo.screenshots,
        videoEmbed: detailedToolInfo.videoEmbed,
        pros: detailedToolInfo.pros?.length ? detailedToolInfo.pros : generateDefaultPros(detailedToolInfo.name || "tool", cleanQuery),
        cons: detailedToolInfo.cons?.length ? detailedToolInfo.cons : generateDefaultCons(),
        lastUpdated: detailedToolInfo.lastUpdated || new Date().toLocaleDateString(),
        badges: detailedToolInfo.badges || ["AI", cleanQuery],
        rating: detailedToolInfo.rating,
        imageUrl: detailedToolInfo.imageUrl,
        websiteUrl: detailedToolInfo.websiteUrl || initialUrl // Ensure websiteUrl is part of AppTool
      };
      processedTools.push(finalTool);
    }

    if (processedTools.length === 0) {
       console.log("Tool processing resulted in zero tools. Creating a fallback.");
      return [createFallbackTool(cleanQuery, "ProcessingFailed")];
    }

    // --- Rank tools by relevance (if more than one) ---
    if (processedTools.length > 1) {
      console.log(`Ranking ${processedTools.length} tools for query: "${cleanQuery}"`);
      try {
        const rankedToolsString = await analyzeTool({
          tools: processedTools.map(t => ({ name: t.name, description: t.description, features: t.features, categories: t.categories })),
          query: cleanQuery,
          task: 'rank_tools_by_relevance'
        });
        const rankedTools = JSON.parse(rankedToolsString);
        if (Array.isArray(rankedTools) && rankedTools.length > 0) {
           // Reconstruct AppTool array based on ranked order of names
          const finalRankedTools = rankedTools.map((rankedTool: any) => 
            processedTools.find(pt => pt.name === rankedTool.name)
          ).filter(Boolean) as AppTool[]; // Filter out undefined if any mismatch
          
          if (finalRankedTools.length === processedTools.length) {
             console.log("Successfully ranked tools.");
            return finalRankedTools;
          }
        }
      } catch (e) {
        console.error("Error ranking tools, returning unranked:", e);
        return processedTools; // Return unranked if ranking fails
      }
    }
    
    return processedTools;

  } catch (error) {
    console.error('Error finding tools:', error);
    return [createFallbackTool(query, "MainError")];
  }
};

// --- Helper Functions for Defaults ---
function generateDefaultFeatures(toolName: string, query: string): string[] {
  return [
    `AI-powered ${query} capabilities`,
    `Intuitive interface for ${toolName}`,
    `Automates ${query} tasks effectively`
  ];
}
function generateDefaultPros(toolName: string, query: string): string[] {
  return [
    `${toolName} offers an intuitive interface for ${query} tasks`,
    `Advanced AI algorithms for accurate results related to ${query}`,
    `Time-saving automation for ${query} workflows`,
  ];
}
function generateDefaultCons(): string[] {
  return [
    "Advanced features may have a learning curve or require a subscription",
    "Specific integrations might be limited"
  ];
}
function generateDefaultUseCases(query: string): string[] {
  return [
    `Automated ${query} for various applications`,
    `Generating insights from ${query} data`,
    `Streamlining ${query} workflows with AI assistance`,
  ];
}

function createFallbackTool(query: string, source: string): AppTool {
  const cleanQuery = query.replace(/[^\w\s]/gi, '').trim();
  const toolName = `AI ${cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)} Tool`;
  return {
    name: toolName,
    description: `A versatile AI tool for ${query}. Designed to assist with various tasks using advanced AI. Please visit the website for specific details. This is a fallback entry.`, // More descriptive fallback
    url: `https://www.google.com/search?q=${encodeURIComponent(query + " AI tool")}`,
    source: source,
    categories: [query, "AI", "Fallback"],
    features: generateDefaultFeatures(toolName, query),
    useCases: generateDefaultUseCases(query),
    pros: generateDefaultPros(toolName, query),
    cons: generateDefaultCons(),
    lastUpdated: new Date().toLocaleDateString(),
    pricing: "Visit website for details",
    tagline: `Your AI assistant for ${query}`,
    websiteUrl: `https://www.google.com/search?q=${encodeURIComponent(query + " AI tool")}`
  };
}

console.log("Tool Finder Service: Consider adding the AI Directories list from https://github.com/harshith-eth/ai-directories for a more comprehensive tool discovery process. You can configure it in TOOL_SOURCES."); 