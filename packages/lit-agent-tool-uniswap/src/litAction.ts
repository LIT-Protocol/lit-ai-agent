declare global {
  const Lit: any;
  const LitActions: any;
  const ethers: any;
  const chainInfo: any;
  const params: any;
  const pkpEthAddress: any;
  const publicKey: any;
  const LitAuth: any;
}

export default async () => {
  const LIT_AGENT_REGISTRY_ABI = [
    "function getActionPolicy(address user, address pkp, string calldata ipfsCid) external view returns (bool isPermitted, bytes memory description, bytes memory policy)",
  ];
  const LIT_AGENT_REGISTRY_ADDRESS =
    "0x728e8162603F35446D09961c4A285e2643f4FB91";

  try {
    // Validate auth parameters
    if (!LitAuth.authSigAddress) {
      throw new Error("Missing required parameter: LitAuth.authSigAddress");
    }
    if (!LitAuth.actionIpfsIds[0]) {
      throw new Error("Missing required parameter: LitAuth.actionIpfsIds[0]");
    }
    if (!pkpEthAddress) {
      throw new Error("Missing required parameter: pkpEthAddress");
    }

    // Validate swap parameters
    if (!params.tokenIn) {
      throw new Error("Missing required parameter: tokenIn");
    }
    if (!params.tokenOut) {
      throw new Error("Missing required parameter: tokenOut");
    }
    if (!params.amountIn) {
      throw new Error("Missing required parameter: amountIn");
    }

    // Validate and normalize token addresses
    let tokenIn: string;
    let tokenOut: string;
    try {
      tokenIn = ethers.utils.getAddress(params.tokenIn);
      tokenOut = ethers.utils.getAddress(params.tokenOut);
    } catch (error) {
      throw new Error(
        `Invalid token address: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
    const ethersProvider = new ethers.providers.JsonRpcProvider(
      chainInfo.rpcUrl
    );

    // Create contract instance
    const registryContract = new ethers.Contract(
      LIT_AGENT_REGISTRY_ADDRESS,
      LIT_AGENT_REGISTRY_ABI,
      new ethers.providers.JsonRpcProvider(
        await Lit.Actions.getRpcUrl({
          chain: "base",
        })
      )
    );

    const [isPermitted, , policy] = await registryContract.getActionPolicy(
      LitAuth.authSigAddress, // The user who owns the PKP
      pkpEthAddress, // The PKP address
      LitAuth.actionIpfsIds[0] // The IPFS CID of this Lit Action
    );

    if (!isPermitted) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: "Action not permitted for this PKP",
        }),
      });
      throw new Error("Action not permitted for this PKP");
    }

    // Decode the policy using ABI encoding
    // Define the policy struct format
    const policyStruct = ["tuple(uint256 maxAmount, address[] allowedTokens)"];

    let decodedPolicy;
    try {
      decodedPolicy = ethers.utils.defaultAbiCoder.decode(
        policyStruct,
        policy
      )[0];

      // Validate decoded policy
      if (!decodedPolicy.maxAmount || !decodedPolicy.allowedTokens) {
        throw new Error("Invalid policy format: missing required fields");
      }

      // Validate that maxAmount is a valid number
      try {
        ethers.BigNumber.from(decodedPolicy.maxAmount);
      } catch {
        throw new Error(
          "Invalid policy format: maxAmount is not a valid number"
        );
      }

      // Validate and normalize allowed token addresses
      if (!Array.isArray(decodedPolicy.allowedTokens)) {
        throw new Error("Invalid policy format: allowedTokens is not an array");
      }
      decodedPolicy.allowedTokens = decodedPolicy.allowedTokens.map(
        (token: string) => {
          if (!ethers.utils.isAddress(token)) {
            throw new Error(
              `Invalid policy format: ${token} is not a valid address`
            );
          }
          // Normalize to checksum address
          return ethers.utils.getAddress(token);
        }
      );

      console.log("Policy:", {
        maxAmount: decodedPolicy.maxAmount.toString(),
        allowedTokens: decodedPolicy.allowedTokens,
      });
    } catch (error) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Failed to decode policy: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    // Use the policy's allowed tokens (already normalized to checksum)
    const allowedTokens = decodedPolicy.allowedTokens;

    // Normalize input token addresses to checksum format for comparison
    const normalizedTokenIn = ethers.utils.getAddress(tokenIn);
    const normalizedTokenOut = ethers.utils.getAddress(tokenOut);

    if (!allowedTokens.includes(normalizedTokenIn)) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Token not allowed: ${normalizedTokenIn}`,
        }),
      });
      throw new Error(`Token not allowed: ${normalizedTokenIn}`);
    }
    if (!allowedTokens.includes(normalizedTokenOut)) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Token not allowed: ${normalizedTokenOut}`,
        }),
      });
      throw new Error(`Token not allowed: ${normalizedTokenOut}`);
    }

    const tokenInterface = new ethers.utils.Interface([
      "function decimals() view returns (uint8)",
      "function approve(address spender, uint256 amount) external returns (bool)",
    ]);

    // Use normalized addresses for contract interactions
    const tokenInContract = new ethers.Contract(
      normalizedTokenIn,
      tokenInterface,
      ethersProvider
    );
    const tokenOutContract = new ethers.Contract(
      normalizedTokenOut,
      tokenInterface,
      ethersProvider
    );

    const decimalsIn = await tokenInContract.decimals();
    const decimalsOut = await tokenOutContract.decimals();

    const amountIn = ethers.utils.parseUnits(params.amountIn, decimalsIn);

    // Check against policy maxAmount
    if (amountIn.gt(decodedPolicy.maxAmount)) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Amount exceeds policy limit. Max allowed: ${ethers.utils.formatUnits(decodedPolicy.maxAmount, decimalsIn)}`,
        }),
      });
      throw new Error("Amount exceeds policy limit");
    }

    const amountOutMin = ethers.BigNumber.from(0);

    const approvalTx = {
      to: normalizedTokenIn,
      data: tokenInterface.encodeFunctionData("approve", [
        UNISWAP_V3_ROUTER,
        amountIn,
      ]),
      value: "0x0",
      gasLimit: ethers.utils.hexlify(100000),
      gasPrice: (await ethersProvider.getGasPrice()).mul(2).toHexString(),
      nonce: await ethersProvider.getTransactionCount(pkpEthAddress),
      chainId: chainInfo.chainId,
    };

    console.log("approvalTx", approvalTx);

    // Validate transaction before signing
    try {
      ethers.utils.serializeTransaction(approvalTx);
    } catch (error) {
      console.log("Invalid approval transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Invalid approval transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let approvalSig;
    try {
      approvalSig = await Lit.Actions.signAndCombineEcdsa({
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(approvalTx))
        ),
        publicKey,
        sigName: "erc20ApprovalSig",
      });
    } catch (error) {
      console.log("Error signing approval transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error signing approval transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let signedApprovalTx;
    try {
      const sig = {
        r: "0x" + JSON.parse(approvalSig).r.substring(2),
        s: "0x" + JSON.parse(approvalSig).s,
        v: JSON.parse(approvalSig).v,
      };
      signedApprovalTx = ethers.utils.serializeTransaction(
        approvalTx,
        ethers.utils.joinSignature(sig)
      );
    } catch (error) {
      console.log("Error serializing signed approval transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error serializing signed approval transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let approvalResponse;
    try {
      approvalResponse = await Lit.Actions.runOnce(
        { waitForResponse: true, name: "txnSender" },
        async () => {
          try {
            const provider = new ethers.providers.JsonRpcProvider(
              chainInfo.rpcUrl
            );
            const approvalReceipt =
              await provider.sendTransaction(signedApprovalTx);
            if (!approvalReceipt?.hash) {
              throw new Error("No transaction hash returned");
            }
            return approvalReceipt.hash;
          } catch (error) {
            console.log("Error sending approval transaction:", error);
            throw new Error(
              `Error sending approval transaction: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );

      if (!approvalResponse || approvalResponse === "[ERROR]") {
        throw new Error("Failed to get valid transaction hash from approval");
      }
    } catch (error) {
      console.log("Error in approval transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error in approval transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let approvalConfirmation;
    try {
      approvalConfirmation = await ethersProvider.waitForTransaction(
        approvalResponse,
        1
      );
      if (approvalConfirmation.status === 0) {
        throw new Error("Approval transaction failed");
      }
    } catch (error) {
      console.log("Error confirming approval transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error confirming approval transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    const routerInterface = new ethers.utils.Interface([
      "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) external payable returns (uint256)",
    ]);

    const swapParamsArray = [
      normalizedTokenIn,
      normalizedTokenOut,
      3000,
      pkpEthAddress,
      amountIn,
      amountOutMin,
      0,
    ];

    const swapTx = {
      to: UNISWAP_V3_ROUTER,
      data: routerInterface.encodeFunctionData("exactInputSingle", [
        swapParamsArray,
      ]),
      value: "0x0",
      gasLimit: ethers.utils.hexlify(200000),
      gasPrice: (await ethersProvider.getGasPrice()).mul(2).toHexString(),
      nonce: await ethersProvider.getTransactionCount(pkpEthAddress),
      chainId: chainInfo.chainId,
    };

    // Validate swap transaction before signing
    try {
      ethers.utils.serializeTransaction(swapTx);
    } catch (error) {
      console.log("Invalid swap transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Invalid swap transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let swapSig;
    try {
      swapSig = await Lit.Actions.signAndCombineEcdsa({
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(swapTx))
        ),
        publicKey,
        sigName: "erc20SwapSig",
      });
    } catch (error) {
      console.log("Error signing swap transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error signing swap transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let signedSwapTx;
    try {
      const sig = {
        r: "0x" + JSON.parse(swapSig).r.substring(2),
        s: "0x" + JSON.parse(swapSig).s,
        v: JSON.parse(swapSig).v,
      };
      signedSwapTx = ethers.utils.serializeTransaction(
        swapTx,
        ethers.utils.joinSignature(sig)
      );
    } catch (error) {
      console.log("Error serializing signed swap transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error serializing signed swap transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    let swapResponse;
    try {
      swapResponse = await Lit.Actions.runOnce(
        { waitForResponse: true, name: "txnSender" },
        async () => {
          try {
            const provider = new ethers.providers.JsonRpcProvider(
              chainInfo.rpcUrl
            );
            const swapReceipt = await provider.sendTransaction(signedSwapTx);
            if (!swapReceipt?.hash) {
              throw new Error("No transaction hash returned");
            }
            return swapReceipt.hash;
          } catch (error) {
            console.log("Error sending swap transaction:", error);
            throw new Error(
              `Error sending swap transaction: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );

      if (!swapResponse || swapResponse === "[ERROR]") {
        throw new Error("Failed to get valid transaction hash from swap");
      }
    } catch (error) {
      console.log("Error in swap transaction:", error);
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Error in swap transaction: ${error instanceof Error ? error.message : String(error)}`,
        }),
      });
      throw error;
    }

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        approvalHash: approvalResponse,
        swapHash: swapResponse,
      }),
    });
  } catch (error: any) {
    console.log("Top level error:", error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "error",
        error: error.message,
      }),
    });
  }
};
