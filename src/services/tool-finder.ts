import { scrapeSingleUrl, crawlWebsite } from './firecrawl';
import { analyzeTool } from './azure-openai';
import type { FirecrawlDocument } from '../types/firecrawl';

interface ToolSource {
  url: string;
  name: string;
}

const TOOL_SOURCES: ToolSource[] = [
  { url: 'https://theresanaiforthat.com/', name: 'TheresAnAIForThat' },
  { url: 'https://toolfolio.io/', name: 'Toolfolio' },
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
}

export const findTools = async (query: string): Promise<Tool[]> => {
  try {
    const tools: Tool[] = [];

    // Scrape each source
    for (const source of TOOL_SOURCES) {
      const result = await crawlWebsite(source.url, {
        limit: 10, // Limit to 10 pages per source
        scrapeOptions: {
          formats: ['markdown', 'html', 'json'],
          jsonOptions: {
            prompt: `Extract tools related to: ${query}. Include name, description, URL, pricing, and categories.`,
            systemPrompt: 'You are a tool data extraction expert. Extract structured data about software tools and applications.'
          }
        }
      });

      if (result.success) {
        // Process each page's data
        const toolsFromSource = await processScrapedData(result.data, source.name, query);
        tools.push(...toolsFromSource);
      }
    }

    // Sort tools by relevance (you can implement custom sorting logic)
    const sortedTools = await sortToolsByRelevance(tools, query);

    return sortedTools;
  } catch (error) {
    console.error('Error finding tools:', error);
    throw error;
  }
};

const processScrapedData = async (
  documents: FirecrawlDocument[],
  sourceName: string,
  query: string
): Promise<Tool[]> => {
  const tools: Tool[] = [];

  for (const doc of documents) {
    if (doc.json) {
      // If we have structured JSON data
      const toolData = doc.json;
      if (isValidToolData(toolData)) {
        const analysis = await analyzeTool(toolData);
        tools.push({
          ...toolData,
          source: sourceName,
          description: analysis
        });
      }
    } else if (doc.markdown || doc.html) {
      // If we only have unstructured content, use Azure OpenAI to extract tool information
      const content = doc.markdown || doc.html;
      const analysis = await analyzeTool({
        content,
        query,
        source: sourceName
      });
      
      try {
        const toolData = JSON.parse(analysis);
        if (isValidToolData(toolData)) {
          tools.push({
            ...toolData,
            source: sourceName
          });
        }
      } catch (error) {
        console.error('Error parsing tool data:', error);
      }
    }
  }

  return tools;
};

const sortToolsByRelevance = async (tools: Tool[], query: string): Promise<Tool[]> => {
  try {
    // Use Azure OpenAI to rank tools by relevance
    const analysis = await analyzeTool({
      tools,
      query,
      task: 'rank_tools_by_relevance'
    });

    try {
      const rankedTools = JSON.parse(analysis);
      return rankedTools;
    } catch (error) {
      console.error('Error parsing ranked tools:', error);
      return tools; // Return original order if ranking fails
    }
  } catch (error) {
    console.error('Error ranking tools:', error);
    return tools;
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