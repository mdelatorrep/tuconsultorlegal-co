/**
 * OpenAI Responses API Utilities
 * Centralized handling for the new Responses API (recommended over Chat Completions)
 * 
 * Key differences from Chat Completions:
 * - Endpoint: /v1/responses (not /v1/chat/completions)
 * - Uses `input` instead of `messages`
 * - Uses `instructions` for system/developer messages
 * - Role `developer` replaces `system`
 * - Output at: response.output[0].content[0].text (or use output_text helper)
 * - Uses `max_output_tokens` for all models
 * - Temperature supported for all models in this API
 * - JSON mode: text.format.type = "json_object"
 */

export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

/**
 * Build request parameters for OpenAI Responses API
 */
export function buildResponsesRequestParams(
  model: string,
  options: {
    input: string | Array<{ role: 'developer' | 'user' | 'assistant'; content: string | Array<{ type: string; [key: string]: unknown }> }>;
    instructions?: string;
    maxOutputTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
    stream?: boolean;
    store?: boolean;
    tools?: Array<{
      type: 'function';
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }>;
    toolChoice?: string | { type: 'function'; function: { name: string } };
    reasoning?: { effort?: 'low' | 'medium' | 'high'; summary?: 'brief' | 'detailed' };
  }
): Record<string, unknown> {
  const {
    input,
    instructions,
    maxOutputTokens,
    temperature,
    jsonMode,
    stream,
    store,
    tools,
    toolChoice,
    reasoning
  } = options;

  const params: Record<string, unknown> = {
    model,
    input,
  };

  // Instructions (replaces system message)
  if (instructions) {
    params.instructions = instructions;
  }

  // Token limits
  if (maxOutputTokens) {
    params.max_output_tokens = maxOutputTokens;
  }

  // Temperature (supported for all models in Responses API)
  if (temperature !== undefined) {
    params.temperature = temperature;
  }

  // JSON mode via text format
  if (jsonMode) {
    params.text = { format: { type: 'json_object' } };
  }

  // Streaming
  if (stream !== undefined) {
    params.stream = stream;
  }

  // Storage (default true, set false for privacy)
  if (store !== undefined) {
    params.store = store;
  }

  // Tools (function calling)
  if (tools && tools.length > 0) {
    params.tools = tools;
  }
  if (toolChoice) {
    params.tool_choice = toolChoice;
  }

  // Reasoning config for o-series and GPT-5 models
  if (reasoning) {
    params.reasoning = reasoning;
  }

  return params;
}

/**
 * Convert Chat Completions format messages to Responses API format
 */
export function convertMessagesToResponsesFormat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): { instructions?: string; input: Array<{ role: 'developer' | 'user' | 'assistant'; content: string }> } {
  let instructions: string | undefined;
  const input: Array<{ role: 'developer' | 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // First system message becomes instructions
      if (!instructions) {
        instructions = msg.content;
      } else {
        // Additional system messages become developer messages
        input.push({ role: 'developer', content: msg.content });
      }
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      input.push({ role: msg.role, content: msg.content });
    }
  }

  return { instructions, input };
}

/**
 * Extract text from Responses API output
 */
export function extractOutputText(response: {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  output_text?: string;
}): string | null {
  // Use output_text shortcut if available (most common)
  if (response.output_text) {
    return response.output_text;
  }

  // Otherwise traverse the output array
  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          // Check for both 'text' and 'output_text' types
          if ((content.type === 'text' || content.type === 'output_text') && content.text) {
            return content.text;
          }
        }
      }
    }
  }

  // Log if we couldn't extract text for debugging
  console.warn('extractOutputText: Could not extract text from response', JSON.stringify(response, null, 2));
  return null;
}

/**
 * Make a request to OpenAI Responses API
 */
export async function callResponsesAPI(
  apiKey: string,
  params: Record<string, unknown>
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  text?: string;
  error?: string;
  status?: number;
}> {
  try {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI Responses API error: ${response.status}`, errorText);
      return {
        success: false,
        error: `OpenAI API error: ${response.status} ${response.statusText}`,
        status: response.status
      };
    }

    const data = await response.json();
    
    // Log the full response structure for debugging
    console.log('OpenAI Responses API full response:', JSON.stringify(data, null, 2));
    
    const text = extractOutputText(data);
    
    // Log extraction result
    console.log('Extracted text:', text ? `${text.substring(0, 100)}...` : 'null');

    return {
      success: true,
      data,
      text: text || undefined
    };
  } catch (error) {
    console.error('OpenAI Responses API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log Responses API request for debugging
 */
export function logResponsesRequest(model: string, functionName: string, hasInstructions: boolean): void {
  console.log(`[${functionName}] Using Responses API with model: ${model}`);
  console.log(`  - Has instructions: ${hasInstructions}`);
  console.log(`  - Endpoint: ${OPENAI_RESPONSES_ENDPOINT}`);
}

/**
 * Helper to migrate a Chat Completions call to Responses API
 * This provides an easy migration path
 */
export async function migratedChatToResponses(
  apiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model: string;
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
    stream?: boolean;
    functionName?: string;
  }
): Promise<{
  success: boolean;
  text?: string;
  data?: Record<string, unknown>;
  error?: string;
}> {
  const { instructions, input } = convertMessagesToResponsesFormat(messages);
  
  if (options.functionName) {
    logResponsesRequest(options.model, options.functionName, !!instructions);
  }

  const params = buildResponsesRequestParams(options.model, {
    input,
    instructions,
    maxOutputTokens: options.maxTokens,
    temperature: options.temperature,
    jsonMode: options.jsonMode,
    stream: options.stream,
    store: false // Don't store by default for privacy
  });

  return callResponsesAPI(apiKey, params);
}
