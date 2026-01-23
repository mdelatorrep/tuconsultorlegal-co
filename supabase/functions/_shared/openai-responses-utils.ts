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
 * - Web Search Tool: Use `web_search` for grounded responses with citations
 */

export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

// ============= Web Search Types =============

/**
 * User location for web search geolocation
 */
export interface WebSearchUserLocation {
  type: 'approximate';
  country?: string;  // ISO 3166-1 alpha-2 (e.g., 'CO')
  city?: string;
  region?: string;
}

/**
 * Web Search tool configuration (simple format for Responses API)
 * Compatible with: gpt-5, gpt-5-mini (NOT gpt-5-nano)
 * Note: OpenAI Responses API only accepts { type: "web_search_preview" } without nested config
 */
export interface WebSearchTool {
  type: 'web_search_preview';
}

/**
 * Web Search tool with domain filtering - Note: Currently OpenAI only supports simple format
 */
export type WebSearchToolWithDomains = WebSearchTool;

/**
 * Citation from web search results
 */
export interface WebSearchCitation {
  url: string;
  title?: string;
  start_index: number;
  end_index: number;
}

/**
 * Check if a model supports web search
 * GPT-5 and GPT-5-mini support it. GPT-5-nano does NOT.
 */
export function supportsWebSearch(model: string): boolean {
  const lowerModel = model.toLowerCase();
  // gpt-5-nano explicitly does NOT support web_search_preview
  if (lowerModel.includes('gpt-5-nano') || lowerModel.includes('nano')) {
    return false;
  }
  // gpt-5 and gpt-5-mini support it
  return lowerModel.includes('gpt-5') || lowerModel.includes('gpt-5-mini');
}

/**
 * Build a web search tool configuration
 * Note: OpenAI Responses API only accepts the simple { type: "web_search_preview" } format
 * Domain filtering and other options are specified in the instructions/prompt instead
 */
export function buildWebSearchTool(_options?: {
  allowedDomains?: string[];
  userLocation?: WebSearchUserLocation;
  searchContextSize?: 'low' | 'medium' | 'high';
}): WebSearchTool {
  // OpenAI Responses API only accepts the simple format
  return { type: 'web_search_preview' };
}

/**
 * Extract web search citations from response
 */
export function extractWebSearchCitations(response: Record<string, unknown>): WebSearchCitation[] {
  const citations: WebSearchCitation[] = [];
  
  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output as Array<Record<string, unknown>>) {
      if (item.type === 'message' && item.content && Array.isArray(item.content)) {
        for (const content of item.content as Array<Record<string, unknown>>) {
          if (content.type === 'output_text' && content.annotations && Array.isArray(content.annotations)) {
            for (const annotation of content.annotations as Array<Record<string, unknown>>) {
              if (annotation.type === 'url_citation') {
                citations.push({
                  url: annotation.url as string,
                  title: annotation.title as string | undefined,
                  start_index: annotation.start_index as number,
                  end_index: annotation.end_index as number
                });
              }
            }
          }
        }
      }
    }
  }
  
  return citations;
}

/**
 * Function type categories for reasoning effort configuration
 */
export type ReasoningFunctionType = 'text_generation' | 'analysis' | 'strategy' | 'research';

/**
 * Default effort levels for each function type
 * These can be overridden via system_config
 */
export const DEFAULT_REASONING_EFFORTS: Record<ReasoningFunctionType, 'low' | 'medium' | 'high'> = {
  text_generation: 'low',
  analysis: 'medium',
  strategy: 'high',
  research: 'high'
};

/**
 * Get the appropriate reasoning effort for a function type
 * This returns the default mapping - override with system_config values when available
 */
export function getReasoningEffortForType(type: ReasoningFunctionType): 'low' | 'medium' | 'high' {
  return DEFAULT_REASONING_EFFORTS[type] || 'low';
}

/**
 * Detect if a model is a reasoning model (GPT-5, o3, o4)
 * Reasoning models use internal reasoning tokens and need effort configuration
 */
export function isReasoningModel(model: string): boolean {
  const lowerModel = model.toLowerCase();
  return (
    lowerModel.includes('gpt-5') ||
    lowerModel.includes('o3') ||
    lowerModel.includes('o4')
  );
}

/**
 * Detect if a model supports the temperature parameter
 * GPT-5, o3, o4 models do NOT support temperature
 */
export function supportsTemperature(model: string): boolean {
  return !isReasoningModel(model);
}

/**
 * Get supported reasoning efforts for a model
 * gpt-5-pro only supports 'high'
 * Other reasoning models support 'low', 'medium', 'high'
 * Non-reasoning models don't use reasoning at all
 */
export function getSupportedReasoningEfforts(model: string): ('low' | 'medium' | 'high')[] | null {
  const lowerModel = model.toLowerCase();
  
  // gpt-5-pro only supports 'high'
  if (lowerModel.includes('gpt-5-pro') || lowerModel.includes('gpt5-pro')) {
    return ['high'];
  }
  
  // Other reasoning models support all efforts
  if (isReasoningModel(model)) {
    return ['low', 'medium', 'high'];
  }
  
  // Non-reasoning models don't use reasoning
  return null;
}

/**
 * Validate and adjust reasoning effort based on model capabilities
 * Returns the adjusted effort or null if reasoning should not be used
 */
export function validateReasoningEffort(
  model: string, 
  requestedEffort?: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' | null {
  const supportedEfforts = getSupportedReasoningEfforts(model);
  
  // Model doesn't support reasoning
  if (supportedEfforts === null) {
    return null;
  }
  
  // No effort requested, use default based on model
  if (!requestedEffort) {
    return supportedEfforts.includes('medium') ? 'medium' : 'high';
  }
  
  // Check if requested effort is supported
  if (supportedEfforts.includes(requestedEffort)) {
    return requestedEffort;
  }
  
  // Fallback to highest supported effort
  console.log(`[Reasoning] Model ${model} doesn't support effort '${requestedEffort}', falling back to '${supportedEfforts[supportedEfforts.length - 1]}'`);
  return supportedEfforts[supportedEfforts.length - 1];
}

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
    webSearch?: WebSearchToolWithDomains;
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
    reasoning,
    webSearch
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

  // Temperature (NOT supported for reasoning models: GPT-5, o3, o4)
  if (temperature !== undefined && supportsTemperature(model)) {
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

  // Combine function tools with web_search if both present
  const allTools: Array<Record<string, unknown>> = [];
  
  // Add web search tool if enabled and model supports it
  if (webSearch && supportsWebSearch(model)) {
    // Web search doesn't work with reasoning effort 'minimal', but 'low/medium/high' are fine
    allTools.push(webSearch);
    console.log(`[WebSearch] Enabled for model ${model}`);
  }
  
  // Add function tools
  if (tools && tools.length > 0) {
    allTools.push(...tools);
  }
  
  if (allTools.length > 0) {
    params.tools = allTools;
  }
  
  if (toolChoice) {
    params.tool_choice = toolChoice;
  }

  // Reasoning config for o-series and GPT-5 models - validate and adjust effort
  if (reasoning) {
    const validatedEffort = validateReasoningEffort(model, reasoning.effort);
    if (validatedEffort) {
      params.reasoning = { ...reasoning, effort: validatedEffort };
    }
    // If validatedEffort is null, don't add reasoning (model doesn't support it)
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
  incomplete?: boolean;
  incompleteReason?: string;
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
    
    // Check for incomplete responses (max_output_tokens, content_filter, etc.)
    const responseStatus = data.status;
    const incompleteDetails = data.incomplete_details;
    
    if (responseStatus === 'incomplete') {
      const reason = incompleteDetails?.reason || 'unknown';
      console.warn(`OpenAI response incomplete: ${reason}`, JSON.stringify(incompleteDetails));
      
      // Still try to extract partial text if available
      const partialText = extractOutputText(data);
      
      return {
        success: false,
        data,
        text: partialText || undefined,
        error: `Response incomplete: ${reason}`,
        incomplete: true,
        incompleteReason: reason
      };
    }
    
    // Log the full response structure for debugging
    console.log('OpenAI Responses API status:', responseStatus);
    
    const text = extractOutputText(data);
    
    // Log extraction result
    if (!text) {
      console.warn('extractOutputText returned null for completed response');
    }

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

// ============= Background Polling API =============

/**
 * Response status types from OpenAI Background API
 */
export type BackgroundResponseStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'incomplete';

/**
 * Background response result
 */
export interface BackgroundResponseResult {
  success: boolean;
  data?: Record<string, unknown>;
  text?: string;
  error?: string;
  status?: BackgroundResponseStatus;
  responseId?: string;
  pollingIterations?: number;
}

/**
 * Start a background response request
 * Uses background: true to run asynchronously
 */
export async function startBackgroundResponse(
  apiKey: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; responseId?: string; error?: string; status?: BackgroundResponseStatus }> {
  try {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        background: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI Background API error: ${response.status}`, errorText);
      return {
        success: false,
        error: `OpenAI API error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    console.log(`[Background] Started response: ${data.id}, status: ${data.status}`);
    
    return {
      success: true,
      responseId: data.id,
      status: data.status
    };
  } catch (error) {
    console.error('OpenAI Background API start failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Poll for background response status
 * GET /v1/responses/{id}
 */
export async function pollBackgroundResponse(
  apiKey: string,
  responseId: string
): Promise<{ success: boolean; data?: Record<string, unknown>; status?: BackgroundResponseStatus; error?: string }> {
  try {
    const response = await fetch(`${OPENAI_RESPONSES_ENDPOINT}/${responseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI Poll API error: ${response.status}`, errorText);
      return {
        success: false,
        error: `OpenAI API error: ${response.status}`,
        status: 'failed'
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      status: data.status
    };
  } catch (error) {
    console.error('OpenAI Poll API failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    };
  }
}

/**
 * Execute a background response with polling
 * Starts the request with background: true, then polls until completion
 * 
 * @param apiKey - OpenAI API key
 * @param params - Request parameters (background: true will be added)
 * @param options - Polling options
 * @returns Result with success/error and extracted text
 */
export async function callResponsesAPIWithPolling(
  apiKey: string,
  params: Record<string, unknown>,
  options: {
    pollIntervalMs?: number;
    maxPollingTimeMs?: number;
    onPoll?: (status: BackgroundResponseStatus, iteration: number) => void;
  } = {}
): Promise<BackgroundResponseResult> {
  const {
    pollIntervalMs = 2000,
    maxPollingTimeMs = 300000, // 5 minutes default max
    onPoll
  } = options;

  // Start the background request
  console.log('[Background] Starting background request...');
  const startResult = await startBackgroundResponse(apiKey, params);
  
  if (!startResult.success || !startResult.responseId) {
    return {
      success: false,
      error: startResult.error || 'Failed to start background request'
    };
  }

  const responseId = startResult.responseId;
  console.log(`[Background] Response ID: ${responseId}, initial status: ${startResult.status}`);

  // If already completed (unlikely but possible), return immediately
  if (startResult.status === 'completed') {
    const pollResult = await pollBackgroundResponse(apiKey, responseId);
    if (pollResult.success && pollResult.data) {
      const text = extractOutputText(pollResult.data);
      return {
        success: true,
        data: pollResult.data,
        text: text || undefined,
        status: 'completed',
        responseId,
        pollingIterations: 0
      };
    }
  }

  // Poll until completion or timeout
  const startTime = Date.now();
  let iteration = 0;
  
  while (Date.now() - startTime < maxPollingTimeMs) {
    iteration++;
    
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    
    console.log(`[Background] Polling iteration ${iteration}...`);
    const pollResult = await pollBackgroundResponse(apiKey, responseId);
    
    if (!pollResult.success) {
      console.error(`[Background] Poll failed at iteration ${iteration}:`, pollResult.error);
      continue; // Keep trying
    }

    const status = pollResult.status as BackgroundResponseStatus;
    console.log(`[Background] Status: ${status}`);
    
    // Callback for status updates
    if (onPoll) {
      onPoll(status, iteration);
    }

    // Check terminal states
    if (status === 'completed') {
      const text = extractOutputText(pollResult.data!);
      console.log(`[Background] Completed after ${iteration} iterations, ${Date.now() - startTime}ms`);
      return {
        success: true,
        data: pollResult.data,
        text: text || undefined,
        status: 'completed',
        responseId,
        pollingIterations: iteration
      };
    }

    if (status === 'failed') {
      const errorInfo = pollResult.data?.error as { message?: string } | undefined;
      console.error(`[Background] Failed:`, errorInfo);
      return {
        success: false,
        error: errorInfo?.message || 'Request failed',
        status: 'failed',
        responseId,
        pollingIterations: iteration
      };
    }

    if (status === 'cancelled') {
      return {
        success: false,
        error: 'Request was cancelled',
        status: 'cancelled',
        responseId,
        pollingIterations: iteration
      };
    }

    if (status === 'incomplete') {
      const text = extractOutputText(pollResult.data!);
      console.warn(`[Background] Incomplete response after ${iteration} iterations`);
      return {
        success: true,
        data: pollResult.data,
        text: text || undefined,
        status: 'incomplete',
        responseId,
        pollingIterations: iteration
      };
    }

    // Still in queued or in_progress, continue polling
  }

  // Timeout
  console.error(`[Background] Timeout after ${maxPollingTimeMs}ms and ${iteration} iterations`);
  return {
    success: false,
    error: `Polling timeout after ${maxPollingTimeMs / 1000} seconds`,
    status: 'in_progress',
    responseId,
    pollingIterations: iteration
  };
}

// ============= Web Search Configuration Helper =============

/**
 * Load web search configuration from system_config and build tool with domains from knowledge_base_urls
 * 
 * @param supabase - Supabase client with service role
 * @param functionKey - Function identifier (e.g., 'analysis', 'strategy', 'drafting', 'research')
 * @returns WebSearchToolWithDomains if enabled, null otherwise
 */
export async function loadWebSearchConfigAndBuildTool(
  supabase: any,
  functionKey: string
): Promise<WebSearchToolWithDomains | null> {
  try {
    // Read enabled flag from system_config
    const { data: enabledConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', `web_search_enabled_${functionKey}`)
      .maybeSingle();
    
    const enabled = enabledConfig?.config_value === 'true';
    
    if (!enabled) {
      console.log(`[WebSearch] Disabled for function: ${functionKey}`);
      return null;
    }
    
    // Read categories from system_config
    const { data: categoriesConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', `web_search_categories_${functionKey}`)
      .maybeSingle();
    
    let categories: string[] = [];
    try {
      categories = categoriesConfig?.config_value ? JSON.parse(categoriesConfig.config_value) : [];
    } catch (e) {
      console.warn(`[WebSearch] Failed to parse categories for ${functionKey}:`, e);
    }
    
    // Load verified URLs from knowledge_base_urls filtered by categories
    let urlsQuery = supabase
      .from('knowledge_base_urls')
      .select('url')
      .eq('verification_status', 'verified')
      .eq('is_active', true);
    
    if (categories.length > 0) {
      urlsQuery = urlsQuery.in('category', categories);
    }
    
    const { data: urls, error: urlsError } = await urlsQuery;
    
    if (urlsError) {
      console.error(`[WebSearch] Error loading URLs for ${functionKey}:`, urlsError);
    }
    
    const domains = (urls || []).map((u: { url: string }) => u.url);
    
    console.log(`[WebSearch] Enabled for function: ${functionKey}`);
    console.log(`  - Categories: ${categories.length > 0 ? categories.join(', ') : 'all'}`);
    console.log(`  - Verified domains: ${domains.length}`);
    
    // Build web search tool with Colombian geolocation
    return buildWebSearchTool({
      allowedDomains: domains.length > 0 ? domains : undefined,
      userLocation: { 
        type: 'approximate', 
        country: 'CO', 
        city: 'Bogotá' 
      },
      searchContextSize: 'medium'
    });
    
  } catch (error) {
    console.error(`[WebSearch] Error loading config for ${functionKey}:`, error);
    return null;
  }
}
