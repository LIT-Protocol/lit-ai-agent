import { OpenAI } from 'openai';
import {
  listAvailableTools,
  type ToolInfo,
} from '@lit-protocol/fss-tool-registry';
import { generateToolMatchingPrompt } from './generateToolMatchingPrompt';

export async function analyzeUserIntent(
  openai: OpenAI,
  openAiModel: string,
  userIntent: string
): Promise<{
  analysis: any;
  matchedTool: ToolInfo | null;
}> {
  const availableTools = listAvailableTools();
  console.log("availableTools", availableTools);

  const completion = await openai.chat.completions.create({
    model: openAiModel,
    messages: [
      {
        role: 'system',
        content: generateToolMatchingPrompt(availableTools),
      },
      {
        role: 'user',
        content: userIntent,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');
  const matchedTool = analysis.recommendedCID
    ? availableTools.find((tool) => tool.ipfsCid === analysis.recommendedCID) ||
      null
    : null;

  return { analysis, matchedTool };
}
