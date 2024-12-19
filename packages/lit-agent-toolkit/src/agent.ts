import { OpenAI } from "openai";
import type { ethers } from "ethers";

import { getPermittedActions } from "./litAgentRegistry";

export async function analyzeUserIntentAndMatchAction(
  openai: OpenAI,
  userIntent: string,
  litAgentRegistryContract: ethers.Contract,
  userEthAddress: string,
  pkpEthAddress: string
) {
  const permittedActions = await getPermittedActions(
    litAgentRegistryContract,
    userEthAddress,
    pkpEthAddress
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a web3 transaction analyzer. Given a user's intent and permitted actions, determine if there's an appropriate action that matches exactly what the user wants to do.

          Available actions:
          ${permittedActions
            .map(
              (action) => `- CID: ${action.ipfsCid}\n  ${action.description}`
            )
            .join("\n")}

          Important: 
          1. Only return a recommendedCID if you are completely certain the action matches the user's intent exactly
          2. If you're unsure or the user's intent is unclear, return an empty recommendedCID
          3. All values in your response must be strings
          4. If recommending a swap, you must have exact token addresses
          5. If you cannot determine exact addresses or amounts, do not recommend an action

          Return a JSON object with:
          - recommendedCID: the exact ipfsCid if there's a match, or "" if no clear match
          - tokenIn: (for swaps) the input token address as a string
          - tokenOut: (for swaps) the output token address as a string
          - amountIn: the input amount as a string
          - recipientAddress: (for sends) the recipient address as a string
          
          Do not nest parameters in a 'parameters' object.`,
      },
      {
        role: "user",
        content: userIntent,
      },
    ],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || "{}");

  const matchedAction = analysis.recommendedCID
    ? permittedActions.find(
        (action) => action.ipfsCid === analysis.recommendedCID
      )
    : null;

  return {
    analysis,
    matchedAction,
  };
}
