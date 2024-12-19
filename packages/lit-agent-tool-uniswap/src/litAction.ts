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
  try {
    const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
    const ethersProvider = new ethers.providers.JsonRpcProvider(
      chainInfo.rpcUrl
    );

    const allowedTokens = [
      "0x4200000000000000000000000000000000000006", // WETH
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", // Coinbase Wrapped BTC
    ];

    if (!allowedTokens.includes(params.tokenIn)) {
      LitActions.setResponse({
        response: `Token not allowed: ${params.tokenIn}`,
      });
      throw new Error(`Token not allowed: ${params.tokenIn}`);
    }
    if (!allowedTokens.includes(params.tokenOut)) {
      LitActions.setResponse({
        response: `Token not allowed: ${params.tokenOut}`,
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

    const maxAmount = ethers.utils.parseUnits("0.001", decimalsIn);
    if (amountIn.gt(maxAmount)) {
      LitActions.setResponse({ response: "Requested swap amount too large" });
      throw new Error("Requested swap amount too large");
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
