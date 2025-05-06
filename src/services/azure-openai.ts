const AZURE_OPENAI_API_KEY = process.env.VITE_AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_ENDPOINT = 'https://ai-vharshith28100545ai772417990562.cognitiveservices.azure.com';
const AZURE_OPENAI_API_VERSION = '2024-08-01-preview';

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

export const analyzeTool = async (toolData: any): Promise<string> => {
  try {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are an expert at analyzing and recommending tools and software. 
        Given tool information, analyze its features, benefits, and use cases to provide 
        a comprehensive recommendation. Focus on practical applications and value proposition.`
      },
      {
        role: 'user',
        content: `Please analyze this tool and provide a recommendation: ${JSON.stringify(toolData)}`
      }
    ];

    const response = await fetch(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY
        },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          max_tokens: 800
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.statusText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing tool:', error);
    throw error;
  }
}; 