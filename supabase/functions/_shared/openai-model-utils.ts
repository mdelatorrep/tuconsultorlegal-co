/**
 * OpenAI Model Utilities
 * Centralized handling of different OpenAI model generations and their API parameter requirements
 */

// Model generation types
export type ModelGeneration = 'legacy' | 'gpt41' | 'gpt5' | 'reasoning';

/**
 * Detect the generation of an OpenAI model
 * - legacy: gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.
 * - gpt41: gpt-4.1-2025-04-14, gpt-4.1-mini-2025-04-14
 * - gpt5: gpt-5, gpt-5-mini, gpt-5-nano
 * - reasoning: o1, o3, o4 models
 */
export function getModelGeneration(model: string): ModelGeneration {
  if (!model) return 'legacy';
  
  const lowerModel = model.toLowerCase();
  
  // GPT-5 family (gpt-5, gpt-5-mini, gpt-5-nano)
  if (lowerModel.includes('gpt-5')) return 'gpt5';
  
  // Reasoning models (o1, o3, o4-mini, etc.)
  if (/^o[134]/.test(lowerModel)) return 'reasoning';
  
  // GPT-4.1 family
  if (lowerModel.includes('gpt-4.1')) return 'gpt41';
  
  // Legacy (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
  return 'legacy';
}

/**
 * Check if a model supports the temperature parameter
 * GPT-5 and reasoning models do NOT support temperature
 */
export function supportsTemperature(model: string): boolean {
  const gen = getModelGeneration(model);
  return gen === 'legacy' || gen === 'gpt41';
}

/**
 * Get the correct token parameter name for a model
 * - legacy models use max_tokens
 * - newer models use max_completion_tokens
 */
export function getTokenParamName(model: string): 'max_tokens' | 'max_completion_tokens' {
  const gen = getModelGeneration(model);
  return gen === 'legacy' ? 'max_tokens' : 'max_completion_tokens';
}

/**
 * Build OpenAI API request parameters with correct settings for the model
 */
export function buildOpenAIRequestParams(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens?: number;
    temperature?: number;
    responseFormat?: Record<string, unknown>;
    stream?: boolean;
    tools?: Array<Record<string, unknown>>;
    toolChoice?: Record<string, unknown> | string;
  } = {}
): Record<string, unknown> {
  const generation = getModelGeneration(model);
  const { 
    maxTokens = 1000, 
    temperature = 0.3, 
    responseFormat, 
    stream,
    tools,
    toolChoice
  } = options;
  
  const params: Record<string, unknown> = {
    model,
    messages,
  };
  
  // Token parameter based on model generation
  if (generation === 'legacy') {
    params.max_tokens = maxTokens;
  } else {
    params.max_completion_tokens = maxTokens;
  }
  
  // Temperature only for supported models (NOT for GPT-5/reasoning)
  if (supportsTemperature(model)) {
    params.temperature = temperature;
  }
  
  // Optional parameters
  if (responseFormat) params.response_format = responseFormat;
  if (stream !== undefined) params.stream = stream;
  if (tools) params.tools = tools;
  if (toolChoice) params.tool_choice = toolChoice;
  
  return params;
}

/**
 * Log model request details for debugging
 */
export function logModelRequest(model: string, functionName: string): void {
  const gen = getModelGeneration(model);
  console.log(`[${functionName}] Using model: ${model} (generation: ${gen})`);
  console.log(`  - Temperature supported: ${supportsTemperature(model)}`);
  console.log(`  - Token param: ${getTokenParamName(model)}`);
}
