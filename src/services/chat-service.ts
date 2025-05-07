import { analyzeTool } from './azure-openai';

// Define a simplified Tool interface for chat context
interface ChatToolContext {
  name: string;
  description: string;
  url: string;
  features?: string[];
  useCases?: string[];
  pricing?: any; // Can be string or structured, keep it simple for context
  categories?: string[];
  tagline?: string;
}

/**
 * Gets a contextual AI chat response based on the user's message and the current tool.
 * @param userMessage The user's message or question.
 * @param toolContext Optional context of the currently displayed AI tool.
 * @returns A promise that resolves to the AI's response string.
 */
export const getAIChatResponse = async (
  userMessage: string,
  toolContext?: ChatToolContext | null
): Promise<string> => {
  try {
    let systemPrompt = 'You are a helpful AI assistant specialized in discussing software tools. Be concise and informative.';
    let augmentedUserMessage = userMessage;

    if (toolContext) {
      systemPrompt = `You are an AI assistant discussing the tool: ${toolContext.name}. 
      Description: ${toolContext.description}. 
      URL: ${toolContext.url}. 
      Be helpful and answer questions specifically about this tool based on the provided context and the user's query. 
      If the user asks for information not in the context, you can politely say you don't have that specific detail for ${toolContext.name} but can answer general questions or talk about its known features.`;
      
      augmentedUserMessage = `Considering the tool ${toolContext.name} (features: ${toolContext.features?.join(', ') || 'not listed'}, use cases: ${toolContext.useCases?.join(', ') || 'not listed'}), the user asks: ${userMessage}`;
    } else {
      augmentedUserMessage = `The user asks: ${userMessage}. Since no specific tool is in context, try to provide a general helpful answer or guide them to search for a tool.`;
    }

    // Use a specific task for Azure OpenAI if needed, or a general one
    const analysisResult = await analyzeTool({
      query: userMessage, // User's original query for context
      tool_info: toolContext, // Pass tool context for more informed responses
      chat_message: augmentedUserMessage,
      task: 'contextual_chat_response' // A new task type for chat
    });

    // Assuming analyzeTool for this task returns a direct string response or a JSON object with a response field
    try {
      const parsedResult = JSON.parse(analysisResult);
      if (parsedResult && parsedResult.response) {
        return parsedResult.response;
      }
      // If parsing fails or no .response field, return the raw string (maybe it's a direct answer)
      return analysisResult;
    } catch (e) {
      // If JSON.parse fails, it means the response was likely a direct string.
      return analysisResult;
    }

  } catch (error) {
    console.error('Error getting AI chat response:', error);
    return "I'm having a little trouble connecting right now. Please try again in a moment.";
  }
}; 