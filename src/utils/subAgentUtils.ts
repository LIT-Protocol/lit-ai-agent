import OpenAI from 'openai';
import { ethers } from "ethers";
import { getPermittedTools } from './contractUtils';

// Initialize OpenAI with environment check
const initializeOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY is not set in environment");
    process.exit(1);
  }
  return new OpenAI({ apiKey });
};

const openai = initializeOpenAI();

/**
 * Web3 Transaction Intent Analyzer
 * -------------------------------
 * This module provides AI-powered analysis of user intents to match them with permitted blockchain actions.
 * It uses OpenAI's GPT model to understand natural language requests and map them to predefined smart contract
 * interactions.
 * 
 * Core Components:
 * 1. OpenAI Integration
 *    - Validates OPENAI_API_KEY environment variable
 *    - Initializes OpenAI client for API interactions
 * 
 * 2. analyzeUserIntentAndMatchAction Function
 *    - Purpose: Matches natural language requests to specific blockchain actions
 *    - Parameters:
 *      * userIntent: User's request in natural language
 *      * pkpPermissions: Contract instance for checking permitted actions
 *      * provider: Ethereum provider for blockchain interactions
 * 
 * 3. Action Matching Process:
 *    a) Fetches all permitted actions from the smart contract
 *    b) Sends request to GPT with:
 *       - User's intent
 *       - List of available actions and their descriptions
 *       - Strict validation rules for matches
 *    c) Expects structured JSON response containing:
 *       - recommendedCID: IPFS hash of matching action
 *       - tokenIn/tokenOut: Token addresses for swaps
 *       - amountIn: Transaction amount
 *       - recipientAddress: Target address for transfers
 * 
 * Safety Features:
 * - Strict matching criteria to prevent incorrect action execution
 * - Required exact token addresses for swaps
 * - Empty recommendations when uncertain
 * - All parameters must be properly formatted strings
 * 
 * Returns: {
 *   analysis: Parsed GPT response with action parameters
 *   matchedAction: Corresponding permitted action if found, null if no match
 * }
 * 
 * Usage Example:
 * const result = await analyzeUserIntentAndMatchAction(
 *   "swap 1 ETH for USDC",
 *   pkpPermissionsContract,
 *   provider
 * );
 */

export async function analyzeUserIntentAndMatchAction(
  userIntent: string, 
  pkpPermissions: ethers.Contract,
  provider: ethers.providers.Provider
) {
  try {
    const permittedActions = await getPermittedTools(pkpPermissions, provider);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a web3 transaction analyzer. Given a user's intent and permitted actions, determine if there's an appropriate action that matches exactly what the user wants to do.

          Available actions:
          ${permittedActions.map((action: any) => 
            `- CID: ${action.ipfsCid}\n  ${action.description}`
          ).join('\n')}

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
          
          Do not nest parameters in a 'parameters' object.`
        },
        {
          role: "user",
          content: userIntent
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    
    const matchedAction = analysis.recommendedCID ? 
      permittedActions.find((action: { 
        ipfsCid: string; 
        permitted: boolean;
        description: string;
      }) => 
        action.ipfsCid === analysis.recommendedCID && action.permitted
      ) : null;

    return {
      analysis,
      matchedAction
    };
  } catch (error) {
    console.error("Error analyzing intent:", error);
    throw error;
  }
}