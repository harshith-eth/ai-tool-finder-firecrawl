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

export const analyzeTool = async (data: any): Promise<string> => {
  try {
    let systemPrompt = '';
    let userPrompt = '';
    
    // Different prompts based on the task/data type
    if (data.task === 'extract_ai_tools_from_search') {
      systemPrompt = `You are an expert at extracting AI tool information from websites, particularly TheresAnAIForThat.com.
Your task is to extract detailed information about AI tools from the provided content.
Return the data as a JSON array of tools, where each tool has these properties:
- name: The name of the tool
- description: A brief description of what the tool does
- url: The URL to access the tool
- pricing: Any pricing information available (string)
- categories: An array of categories the tool belongs to

Focus on finding ALL tools mentioned in the content that match the search query.
If you cannot find any tools, return at least one likely AI tool related to the query.`;

      userPrompt = `Search query: "${data.query}"
Extract all AI tools related to this query from the following content.
${data.content ? data.content.substring(0, 50000) : JSON.stringify(data).substring(0, 50000)}

Respond ONLY with a valid JSON array of tools. No explanation or other text.
If no tools are explicitly found, create a plausible AI tool that would match the query.`;
    } 
    else if (data.task === 'extract_tools_generic') {
      systemPrompt = `You are an expert at identifying and extracting software tool information from web content.
Your task is to analyze the provided HTML/markdown and extract information about any relevant tools.
Return the data as a JSON array of tools with these properties:
- name: The name of the tool
- description: A brief description of what the tool does
- url: The URL to access the tool (use a reasonable URL if not found)
- pricing: Any pricing information (optional)
- categories: Categories the tool belongs to (optional)

If the content has no clear tools, create at least one plausible tool that matches the query.`;

      userPrompt = `Query: "${data.query}"
Content to analyze:
${data.content ? data.content.substring(0, 50000) : JSON.stringify(data).substring(0, 50000)}

Respond ONLY with a valid JSON array of tools. No explanation or other text.`;
    }
    else if (data.task === 'extract_tools') {
      systemPrompt = `You are an expert data analyst specializing in extracting structured information about software tools.
Your task is to analyze the provided JSON data and extract information about software tools.
Return the data as a JSON array of tools with proper structure.`;

      userPrompt = `Extract tool information from this data:
${JSON.stringify(data.data)}

Focus on tools related to: "${data.query}"
Respond ONLY with a valid JSON array of tools. Each tool should have:
- name
- description
- url
- Optional: pricing, categories`;
    }
    else if (data.task === 'rank_tools_by_relevance') {
      systemPrompt = `You are an expert at ranking and evaluating software tools based on user queries.
Your task is to analyze and rank the provided tools based on their relevance to the user's query.
Order them from most to least relevant to the query.`;

      userPrompt = `Query: "${data.query}"
Tools to rank: ${JSON.stringify(data.tools)}

Reorder these tools based on their relevance to the query. Return ONLY a JSON array of the same tools, but ordered by relevance.`;
    }
    else {
      // Default analysis prompt
      systemPrompt = `You are an expert at analyzing and recommending tools and software. 
Given tool information, analyze its features, benefits, and use cases to provide 
a comprehensive recommendation. Focus on practical applications and value proposition.`;

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
          temperature: data.task ? 0.1 : 0.7, // Lower temperature for extraction tasks
          max_tokens: 2000, // Increased token limit for larger outputs
          response_format: data.task ? { type: "json_object" } : undefined // Request JSON for extraction tasks
        })
      });

      if (!response.ok) {
        console.error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
        
        // Return a fallback response for fault tolerance
        if (data.task && data.task.includes('extract')) {
          return JSON.stringify([{
            name: `AI ${data.query || 'Tool'}`,
            description: `This is an AI tool related to ${data.query || 'various tasks'}.`,
            url: `https://example.com/ai-tools/${data.query?.replace(/\s+/g, '-').toLowerCase() || 'tool'}`
          }]);
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
        return JSON.stringify([{
          name: `AI ${data.query || 'Tool'}`,
          description: `This is an AI tool related to ${data.query || 'various tasks'}.`,
          url: `https://example.com/ai-tools/${data.query?.replace(/\s+/g, '-').toLowerCase() || 'tool'}`
        }]);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error analyzing tool:', error);
    
    // Return a default response for extraction tasks to ensure the app doesn't break
    if (data.task && data.task.includes('extract')) {
      return JSON.stringify([{
        name: `AI ${data.query || 'Assistant'}`,
        description: `This is an AI tool designed to help with ${data.query || 'various tasks'}.`,
        url: `https://theresanaiforthat.com/search?q=${encodeURIComponent(data.query || 'assistant')}`
      }]);
    }
    throw error;
  }
}; 