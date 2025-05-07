const AZURE_API_KEY = import.meta.env.VITE_AZURE_API_KEY || '';
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_ENDPOINT || 'https://ai-vharshith28100545ai772417990562.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Analyzes AI tool data using Azure OpenAI service
 * @param data The data to analyze
 * @returns A string with the analysis result (typically JSON)
 */
export const analyzeTool = async (data: any): Promise<string> => {
  try {
    let systemPrompt = '';
    let userPrompt = '';
    
    // Different prompts based on the task/data type
    if (data.task === 'extract_ai_tools_from_search') {
      systemPrompt = `You are an expert at extracting AI tool information from websites.
Your task is to extract detailed information about AI tools from the provided content.
Return the data as a JSON array of tools, where each tool has these properties:
- name: The name of the tool
- description: A brief description of what the tool does
- url: The URL to access the tool
- pricing: Any pricing information available (string)
- categories: An array of categories the tool belongs to
- useCases: (Optional) Array of use cases for the tool
- pros: (Optional) Array of advantages/benefits
- cons: (Optional) Array of limitations/drawbacks
- imageUrl: (Optional) URL to the tool's logo or image
- videoEmbed: (Optional) URL to a demo video

Focus on finding ALL tools mentioned in the content that match the search query.
If you cannot find any tools, return at least one likely AI tool related to the query.`;

      userPrompt = `Search query: "${data.query}"
Extract all AI tools related to this query from the following content.
${data.content ? data.content.substring(0, 70000) : JSON.stringify(data).substring(0, 70000)}

Respond ONLY with a valid JSON array of tools. No explanation or other text.
If no tools are explicitly found, create a plausible AI tool that would match the query.`;
    } 
    else if (data.task === 'extract_tools_generic') {
      systemPrompt = `You are an expert at identifying and extracting software tool information from web content.
Your task is to analyze the provided HTML/markdown and extract information about any relevant AI tools.
Return the data as a JSON array of tools with these properties:
- name: The name of the tool
- description: A detailed description of what the tool does
- url: The URL to access the tool (use a reasonable URL if not found)
- pricing: Any pricing information (optional)
- categories: Categories the tool belongs to (optional)
- features: Array of key features (optional)
- useCases: Array of specific use cases (optional)
- pros: Array of advantages/benefits (optional)
- cons: Array of limitations/drawbacks (optional)

Focus on finding tools that use AI for ${data.query} tasks.`;

      userPrompt = `Query: "${data.query}"
Content to analyze:
${data.content ? data.content.substring(0, 70000) : JSON.stringify(data).substring(0, 70000)}

Respond ONLY with a valid JSON array of tools. No explanation or other text.`;
    }
    else if (data.task === 'extract_tools') {
      systemPrompt = `You are an expert data analyst specializing in extracting structured information about AI tools.
Your task is to analyze the provided JSON data and extract information about AI tools focused on ${data.query}.
Return the data as a JSON array of tools with proper structure.`;

      userPrompt = `Extract tool information from this data:
${JSON.stringify(data.data)}

Focus on tools related to: "${data.query}"
Respond ONLY with a valid JSON array of tools. Each tool should have:
- name
- description
- url
- pricing (if available)
- categories (if available)
- features (if available)
- useCases (if available)
- pros (if available)
- cons (if available)`;
    }
    else if (data.task === 'rank_tools_by_relevance') {
      systemPrompt = `You are an expert at ranking and evaluating AI tools based on user queries.
Your task is to analyze and rank the provided tools based on their relevance to the user's query.
Order them from most to least relevant to the query "${data.query}".
Consider factors like feature match, description relevance, and specific capabilities.`;

      userPrompt = `Query: "${data.query}"
Tools to rank: ${JSON.stringify(data.tools)}

Reorder these tools based on their relevance to the query.
Return ONLY a JSON array of the same tools, but ordered by relevance, with the most relevant tool first.
Do not add or remove any tools. Do not modify the tool data, only their order.`;
    }
    else if (data.task === 'enhance_tool_details') {
      systemPrompt = `You are an expert at enhancing AI tool descriptions and information.
Your task is to take partial information about an AI tool and enhance it with additional details.
Fill in missing information using reasonable inferences based on the tool's name, description, and purpose.`;

      userPrompt = `Tool to enhance: ${JSON.stringify(data.tool)}
User query: "${data.query}"

Enhance this tool information by:
1. Generating appropriate pros and cons if missing
2. Creating reasonable use cases related to "${data.query}" if missing
3. Inferring potential features based on the description
4. Suggesting appropriate categories if missing

Return the enhanced tool as a single JSON object with all the original fields plus any added fields.`;
    }
    else if (data.task === 'contextual_chat_response') {
      // System prompt is already set by the chat service based on context
      // User prompt is also augmented by the chat service
      systemPrompt = data.system_prompt || `You are a helpful AI assistant. The user is asking about an AI tool.`;
      userPrompt = data.chat_message || data.query;
    }
    else {
      // Default analysis prompt
      systemPrompt = `You are an expert at analyzing and recommending AI tools and software. 
Given tool information, analyze its features, benefits, and use cases to provide 
a comprehensive recommendation. Focus on practical applications for "${data.query || 'the user'}" and value proposition.`;

      userPrompt = `Please analyze this tool and provide a recommendation:
${typeof data === 'string' ? data : JSON.stringify(data)}`;
    }

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    console.log(`Calling Azure OpenAI with task: ${data.task || 'general_analysis'}`);
    
    // Fetch API key from environment variable
    const apiKey = AZURE_API_KEY;
    if (!apiKey) {
      console.error('Azure OpenAI API key is missing');
      throw new Error('Azure OpenAI API key is missing');
    }
    
    // Extract the actual endpoint URL from the endpoint string
    const endpointUrl = AZURE_ENDPOINT || 
      'https://ai-vharshith28100545ai772417990562.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';
    
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: data.task === 'contextual_chat_response' ? 0.5 : (data.task ? 0.1 : 0.7), // Adjusted temperature for chat
          max_tokens: data.task === 'contextual_chat_response' ? 500 : 4000, // Adjusted tokens for chat
          response_format: (data.task && data.task !== 'contextual_chat_response') ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
        console.error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        
        // Return a fallback response for fault tolerance
        if (data.task && data.task.includes('extract')) {
          return createFallbackToolResponse(data.query || 'AI tool');
        }
        throw new Error(`Azure OpenAI API error: ${response.statusText}. Details: ${errorText}`);
      }

      const responseData: ChatCompletionResponse = await response.json();
      console.log('Azure OpenAI response received successfully');
      return responseData.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      
      // Return a fallback response for fault tolerance
      if (data.task && data.task.includes('extract')) {
        return createFallbackToolResponse(data.query || 'AI tool');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error analyzing tool:', error);
    
    // Return a default response for extraction tasks to ensure the app doesn't break
    if (data.task && data.task.includes('extract')) {
      return createFallbackToolResponse(data.query || 'AI assistant');
    }
    throw error;
  }
};

/**
 * Creates a fallback tool response in case the API call fails
 * @param query The user query
 * @returns A JSON string containing a fallback tool
 */
function createFallbackToolResponse(query: string): string {
  const queryClean = query.replace(/[^\w\s]/gi, '').trim();
  const toolName = `AI ${queryClean.charAt(0).toUpperCase() + queryClean.slice(1)} Assistant`;
  
  return JSON.stringify([{
    name: toolName,
    description: `An advanced AI tool designed to help with ${query} tasks through intelligent automation and data processing.`,
    url: `https://theresanaiforthat.com/search?q=${encodeURIComponent(query)}`,
    pricing: "Freemium (Free tier available with paid upgrades)",
    categories: [query, "AI", "Automation"],
    useCases: [
      `Streamlining ${query} workflows`,
      `Automating repetitive ${query} tasks`,
      `Generating insights from ${query} data`
    ],
    pros: [
      "Easy to use interface",
      "No coding required",
      "Regular updates and improvements",
      "Integrates with popular tools"
    ],
    cons: [
      "Advanced features require paid subscription",
      "May require initial setup time"
    ]
  }]);
} 