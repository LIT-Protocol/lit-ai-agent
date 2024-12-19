declare global {
  const Lit: any;
  const LitActions: any;
  const ethers: any;
  const chainInfo: any;
  const params: any;
  const pkpEthAddress: any;
  const publicKey: any;
}

export default async () => {
  const LIT_AGENT_REGISTRY_ABI = [
    "function getActionPolicy(address user, address pkp, string calldata ipfsCid) external view returns (bool isPermitted, bytes memory description, bytes memory policy)",
  ];
  const LIT_AGENT_REGISTRY_ADDRESS =
    "0x728e8162603F35446D09961c4A285e2643f4FB91";

  try {
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
      params.user, // The user who owns the PKP
      pkpEthAddress, // The PKP address
      params.recommendedCID // The IPFS CID of this Lit Action
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

      // Validate that allowedTokens contains valid addresses
      if (!Array.isArray(decodedPolicy.allowedTokens)) {
        throw new Error("Invalid policy format: allowedTokens is not an array");
      }
      for (const token of decodedPolicy.allowedTokens) {
        if (!ethers.utils.isAddress(token)) {
          throw new Error(
            `Invalid policy format: ${token} is not a valid address`
          );
        }
      }

      console.log("Policy:", {
        maxAmount: decodedPolicy.maxAmount.toString(),
        allowedTokens: decodedPolicy.allowedTokens,
      });
    } catch (error) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Failed to decode policy: ${error.message}`,
        }),
      });
      throw error;
    }

    // Use the policy's allowed tokens
    const allowedTokens = decodedPolicy.allowedTokens;

    if (!allowedTokens.includes(params.tokenIn)) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Token not allowed: ${params.tokenIn}`,
        }),
      });
      throw new Error(`Token not allowed: ${params.tokenIn}`);
    }
    if (!allowedTokens.includes(params.tokenOut)) {
      LitActions.setResponse({
        response: JSON.stringify({
          status: "error",
          error: `Token not allowed: ${params.tokenOut}`,
        }),
      });
      throw new Error(`Token not allowed: ${params.tokenOut}`);
    }

    const tokenInterface = new ethers.utils.Interface([
      "function decimals() view returns (uint8)",
      "function approve(address spender, uint256 amount) external returns (bool)",
    ]);

    const tokenInContract = new ethers.Contract(
      params.tokenIn,
      tokenInterface,
      ethersProvider
    );
    const tokenOutContract = new ethers.Contract(
      params.tokenOut,
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
      to: params.tokenIn,
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

    const approvalSig = await Lit.Actions.signAndCombineEcdsa({
      toSign: ethers.utils.arrayify(
        ethers.utils.keccak256(ethers.utils.serializeTransaction(approvalTx))
      ),
      publicKey,
      sigName: "erc20ApprovalSig",
    });

    const signedApprovalTx = ethers.utils.serializeTransaction(
      approvalTx,
      ethers.utils.joinSignature({
        r: "0x" + JSON.parse(approvalSig).r.substring(2),
        s: "0x" + JSON.parse(approvalSig).s,
        v: JSON.parse(approvalSig).v,
      })
    );

    const approvalResponse = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(
            chainInfo.rpcUrl
          );
          const approvalReceipt =
            await provider.sendTransaction(signedApprovalTx);
          return approvalReceipt.hash;
        } catch (error) {
          throw error;
        }
      }
    );

    const approvalConfirmation = await ethersProvider.waitForTransaction(
      approvalResponse,
      1
    );
    if (approvalConfirmation.status === 0) {
      throw new Error("Approval transaction failed");
    }

    const routerInterface = new ethers.utils.Interface([
      "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) external payable returns (uint256)",
    ]);

    const swapParamsArray = [
      params.tokenIn,
      params.tokenOut,
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

    const swapSig = await Lit.Actions.signAndCombineEcdsa({
      toSign: ethers.utils.arrayify(
        ethers.utils.keccak256(ethers.utils.serializeTransaction(swapTx))
      ),
      publicKey,
      sigName: "erc20SwapSig",
    });

    const signedSwapTx = ethers.utils.serializeTransaction(
      swapTx,
      ethers.utils.joinSignature({
        r: "0x" + JSON.parse(swapSig).r.substring(2),
        s: "0x" + JSON.parse(swapSig).s,
        v: JSON.parse(swapSig).v,
      })
    );

    const swapResponse = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(
            chainInfo.rpcUrl
          );
          const swapReceipt = await provider.sendTransaction(signedSwapTx);
          return swapReceipt.hash;
        } catch (error) {
          throw error;
        }
      }
    );

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        approvalHash: approvalResponse,
        swapHash: swapResponse,
      }),
    });
  } catch (error: any) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "error",
        error: error.message,
      }),
    });
  }
};
