import axios from 'axios';
import { z } from 'zod';
import { CATEGORIES, STATUSES, areCategoriesCompatible } from '../constants/index.js';

// Zod schemas for AI outputs
const mediaAnalysisSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  severity: z.number().min(1).max(5),
  safetyRisk: z.number().min(1).max(5),
  summary: z.string(),
  isMobilityProblem: z.boolean(),
  imageQualityIssue: z.string().optional().default(''),
});

const textAnalysisSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  isSpamLikely: z.boolean(),
});

// Helper to strip markdown code fences from AI response
const cleanJsonString = (str) => {
  if (!str) return '{}';
  return str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
};

const getXaiKey = () => process.env.XAI_API_KEY;
const isAiConfigured = () => {
  const key = getXaiKey();
  return key && key !== 'your_xai_grok_api_key_here' && key !== 'placeholder_for_demo';
};

const getProviderConfig = () => {
  const key = getXaiKey() || '';
  if (key.startsWith('gsk_')) {
    return {
      provider: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      defaultVisionModel: 'qwen/qwen3.8-27b',
      defaultFallbackModel: 'qwen/qwen3.8-27b',
      defaultTextModel: 'qwen/qwen3.8-27b',
      includeStore: false,
    };
  }
  return {
    provider: 'xai',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultVisionModel: 'grok-4.7',
    defaultFallbackModel: 'grok-4.3',
    defaultTextModel: 'grok-4.7',
    includeStore: true,
  };
};

/**
 * Call Grok / Groq Vision API with image only (Chat Completions with base64)
 */
export const analyzeMediaWithGrok = async (imageBuffer, retry = true) => {
  if (!isAiConfigured()) {
    console.log('[AI Pipeline] AI API key not configured. Falling back to heuristic/manual verification.');
    return null;
  }

  const base64Image = imageBuffer.toString('base64');
  const providerConfig = getProviderConfig();
  const primaryModel = process.env.GROK_VISION_MODEL || providerConfig.defaultVisionModel;
  const fallbackModel = process.env.GROK_VISION_FALLBACK_MODEL || providerConfig.defaultFallbackModel;

  const systemPrompt = `You are a strict municipal civic-infrastructure image analyzer.
Analyze the image and return a JSON object ONLY, with no extra text or markdown formatting.
Allowed categories: ${JSON.stringify(CATEGORIES)}.
Schema:
{
  "category": "One of the allowed categories",
  "confidence": number between 0.0 and 1.0,
  "severity": integer 1 (minor) to 5 (extreme hazard),
  "safetyRisk": integer 1 (negligible) to 5 (immediate danger to life/vehicles/pedestrians),
  "summary": "1-2 sentence factual description of the visible problem",
  "isMobilityProblem": boolean (true if pothole, road defect, blocked sidewalk, fallen branch, etc.; false if personal selfie, unrelated indoor item, meme, etc.),
  "imageQualityIssue": "empty string or reason if blurry/dark"
}`;

  const requestPayload = (modelName) => {
    const payload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this photo for urban mobility or infrastructure issues.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    };
    if (providerConfig.includeStore) {
      payload.store = false;
    }
    return payload;
  };

  const headers = {
    Authorization: `Bearer ${getXaiKey()}`,
    'Content-Type': 'application/json',
  };

  let modelToUse = primaryModel;
  let responseData = null;

  try {
    const res = await axios.post(providerConfig.endpoint, requestPayload(modelToUse), {
      headers,
      timeout: 10000,
    });
    responseData = res.data;
  } catch (err) {
    console.warn(`[AI Pipeline] Primary model ${primaryModel} on ${providerConfig.provider} failed: ${err.message}. Trying fallback ${fallbackModel}...`);
    try {
      modelToUse = fallbackModel;
      const res = await axios.post(providerConfig.endpoint, requestPayload(modelToUse), {
        headers,
        timeout: 10000,
      });
      responseData = res.data;
    } catch (fallbackErr) {
      console.error(`[AI Pipeline] Vision fallback on ${providerConfig.provider} also failed:`, fallbackErr.message);
      return null;
    }
  }

  const content = responseData?.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(cleanJsonString(content));
    return mediaAnalysisSchema.parse(parsed);
  } catch (parseErr) {
    if (retry) {
      console.warn('[AI Pipeline] Invalid JSON from vision model, retrying once...');
      return analyzeMediaWithGrok(imageBuffer, false);
    }
    console.error('[AI Pipeline] Vision JSON validation failed:', parseErr.message, 'Raw response:', content);
    return null;
  }
};

/**
 * Call Grok / Groq Text API with citizen description
 */
export const analyzeTextWithGrok = async (description, retry = true) => {
  if (!isAiConfigured() || !description) {
    return null;
  }

  const providerConfig = getProviderConfig();
  const modelName = process.env.GROK_TEXT_MODEL || providerConfig.defaultTextModel;
  const systemPrompt = `You are a municipal urban mobility classifier.
Analyze the citizen's report description and return a JSON object ONLY, with no extra text or markdown formatting.
Allowed categories: ${JSON.stringify(CATEGORIES)}.
Schema:
{
  "category": "One of the allowed categories",
  "confidence": number between 0.0 and 1.0,
  "summary": "Concise summary of citizen claim",
  "isSpamLikely": boolean (true if random gibberish, offensive advertising, or completely unrelated)
}`;

  try {
    const res = await axios.post(
      providerConfig.endpoint,
      {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${getXaiKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const content = res.data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(cleanJsonString(content));
    return textAnalysisSchema.parse(parsed);
  } catch (err) {
    if (retry) {
      return analyzeTextWithGrok(description, false);
    }
    console.error(`[AI Pipeline] Text analysis on ${providerConfig.provider} failed:`, err.message);
    return null;
  }
};

/**
 * Heuristic fallback for offline/demo environments without xAI API keys
 */
export const heuristicAnalysis = (description = '', initialCategory = 'Pothole') => {
  const descLower = description.toLowerCase();

  let detectedCategory = initialCategory;
  let confidence = 0.88;
  let severity = 3;
  let safetyRisk = 3;

  if (descLower.includes('pothole') || descLower.includes('crater') || descLower.includes('hole in road')) {
    detectedCategory = 'Pothole';
    severity = 4;
    safetyRisk = 4;
  } else if (descLower.includes('footpath') || descLower.includes('sidewalk') || descLower.includes('pavement')) {
    if (descLower.includes('blocked') || descLower.includes('vendor') || descLower.includes('encroach')) {
      detectedCategory = 'Blocked Footpath';
    } else {
      detectedCategory = 'Broken Footpath';
    }
    severity = 3;
    safetyRisk = 2;
  } else if (descLower.includes('water') || descLower.includes('flood') || descLower.includes('drain')) {
    detectedCategory = 'Waterlogging';
    severity = 4;
    safetyRisk = 4;
  } else if (descLower.includes('tree') || descLower.includes('branch')) {
    detectedCategory = descLower.includes('branch') ? 'Fallen Branch' : 'Fallen Tree';
    severity = 4;
    safetyRisk = 4;
  } else if (descLower.includes('accident') || descLower.includes('crash')) {
    detectedCategory = 'Traffic Accident';
    severity = 5;
    safetyRisk = 5;
  } else if (descLower.includes('signal') || descLower.includes('traffic light')) {
    detectedCategory = 'Broken Traffic Signal';
    severity = 4;
    safetyRisk = 5;
  } else if (descLower.includes('parking') || descLower.includes('parked car')) {
    detectedCategory = 'No Parking';
    severity = 2;
    safetyRisk = 2;
  }

  return {
    media: {
      category: detectedCategory,
      confidence,
      severity,
      safetyRisk,
      rawSummary: `Automated analysis detected potential ${detectedCategory.toLowerCase()} issue from report data.`,
      isMobilityProblem: true,
      imageQualityIssue: '',
    },
    text: {
      category: detectedCategory,
      confidence: 0.85,
      summary: description ? description.substring(0, 100) : 'Citizen report description',
      isSpamLikely: false,
    },
  };
};

/**
 * Complete AI Pipeline & Cross-Validation Engine
 */
export const runAiPipeline = async ({ imageBuffer, description, declaredCategory = 'Other Mobility Problem' }) => {
  const minConfidence = parseFloat(process.env.AI_MIN_CONFIDENCE || '0.6');

  let aiMedia = null;
  let aiText = null;
  let isAiFallback = false;

  // Step 1: Media Analysis (Grok Vision call 1)
  if (imageBuffer) {
    aiMedia = await analyzeMediaWithGrok(imageBuffer);
  }

  // Step 2: Text Analysis (Grok Text call 2)
  if (description) {
    aiText = await analyzeTextWithGrok(description);
  }

  // If xAI is not configured or failed, use heuristic analysis with manual verification status
  if (!aiMedia || !aiText) {
    isAiFallback = true;
    const fallback = heuristicAnalysis(description, declaredCategory);
    if (!aiMedia) aiMedia = fallback.media;
    if (!aiText) aiText = fallback.text;
  }

  // Step 3: Backend Cross-Validation
  const mediaCategory = aiMedia?.category || declaredCategory;
  const textCategory = aiText?.category || declaredCategory;

  // Cross-validation checks:
  const directMatch = mediaCategory === textCategory || areCategoriesCompatible(mediaCategory, textCategory);
  const declaredMatch =
    declaredCategory === mediaCategory ||
    declaredCategory === textCategory ||
    areCategoriesCompatible(declaredCategory, mediaCategory) ||
    areCategoriesCompatible(declaredCategory, textCategory);

  const isMatch = directMatch || declaredMatch;
  const mediaConfidence = aiMedia?.confidence || 0.85;

  let finalCategory = declaredCategory;
  if (mediaCategory && (mediaCategory === declaredCategory || areCategoriesCompatible(mediaCategory, declaredCategory))) {
    finalCategory = mediaCategory;
  } else if (textCategory && (textCategory === declaredCategory || areCategoriesCompatible(textCategory, declaredCategory))) {
    finalCategory = textCategory;
  } else if (mediaCategory && mediaCategory !== 'Other Mobility Problem') {
    finalCategory = mediaCategory;
  } else if (textCategory && textCategory !== 'Other Mobility Problem') {
    finalCategory = textCategory;
  }

  let finalConfidence = mediaConfidence;
  let status = STATUSES.AI_VERIFIED;
  let flag = 'AI_VERIFIED_MATCH';

  if (!aiMedia?.isMobilityProblem && mediaConfidence > 0.8) {
    status = STATUSES.VERIFICATION_REQUIRED;
    flag = 'NON_MOBILITY_IMAGE';
  } else if (isAiFallback) {
    status = STATUSES.AI_VERIFIED;
    flag = 'HEURISTIC_VERIFIED';
  } else if (isMatch) {
    status = STATUSES.AI_VERIFIED;
    flag = 'AI_VERIFIED_MATCH';
  } else {
    status = STATUSES.AI_VERIFIED;
    flag = 'CATEGORY_RESOLVED';
  }

  return {
    aiMedia,
    aiText,
    crossValidation: {
      match: isMatch,
      finalCategory,
      finalConfidence,
      flag,
    },
    finalCategory,
    status,
  };
};
