// Import ethers types
import type { BigNumber, Contract } from 'ethers';

declare global {
  // Injected By Lit
  const Lit: any;
  const ethers: {
    providers: {
      JsonRpcProvider: any;
    };
    utils: {
      Interface: any;
      parseUnits: any;
      formatUnits: any;
      formatEther: any;
      arrayify: any;
      keccak256: any;
      serializeTransaction: any;
      joinSignature: any;
      isHexString: any;
      getAddress: any;
      defaultAbiCoder: any;
    };
    BigNumber: any;
    Contract: any;
  };

  // Required Inputs
  const pkp: {
    ethAddress: string;
    publicKey: string;
  };
  const params: {
    rpcUrl: string;
    chainId: number;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  };
}

type JsonRpcProvider = ReturnType<typeof ethers.providers.JsonRpcProvider>;

export default async () => {
  try {
    async function getBestQuote(
      ethersProvider: JsonRpcProvider,
      quoterAddress: string,
      params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: BigNumber;
      }
    ) {
      console.log('Getting best quote for swap...');
      const quoterInterface = new ethers.utils.Interface([
        "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
      ]);

      const FEE_TIERS = [3000, 500];
      let bestQuote = null;
      let bestFee = null;

      for (const fee of FEE_TIERS) {
        try {
          const quoteParams = {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountIn: params.amountIn,
            fee: fee,
            sqrtPriceLimitX96: 0
          };

          console.log(`Trying fee tier ${fee/10000}%...`);
          const quote = await ethersProvider.call({
            to: quoterAddress,
            data: quoterInterface.encodeFunctionData("quoteExactInputSingle", [quoteParams])
          });
          
          const [amountOut] = quoterInterface.decodeFunctionResult("quoteExactInputSingle", quote);
          const currentQuote = ethers.BigNumber.from(amountOut);

          if (!bestQuote || currentQuote.gt(bestQuote)) {
            bestQuote = currentQuote;
            bestFee = fee;
            console.log(`New best quote found with fee tier ${fee/10000}%`);
          }
        } catch (error) {
          if ((error as { reason?: string }).reason === "Unexpected error") {
            console.log(`No pool found for fee tier ${fee/10000}%`);
          } else {
            console.error("Debug: Quoter call failed for fee tier:", fee, error);
          }
          continue;
        }
      }

      if (!bestQuote || !bestFee) {
        throw new Error("Failed to get quote from Uniswap V3. No valid pool found for this token pair.");
      }

      return { quote: bestQuote, fee: bestFee };
    }

    async function getGasData(provider: JsonRpcProvider) {
      console.log('Getting gas data...');
      const baseFeeHistory = await provider.send("eth_feeHistory", ["0x1", "latest", []]);
      const baseFee = ethers.BigNumber.from(baseFeeHistory.baseFeePerGas[0]);
      const nonce = await provider.getTransactionCount(pkp.ethAddress);

      const priorityFee = baseFee.div(4);
      const maxFee = baseFee.mul(2);

      console.log('Gas data:', {
        baseFee: ethers.utils.formatUnits(baseFee, 'gwei'),
        priorityFee: ethers.utils.formatUnits(priorityFee, 'gwei'),
        maxFee: ethers.utils.formatUnits(maxFee, 'gwei'),
        nonce
      });

      return {
        maxFeePerGas: maxFee.toHexString(),
        maxPriorityFeePerGas: priorityFee.toHexString(),
        nonce
      };
    }

    async function createApprovalTx(
      tokenInContract: Contract,
      spenderAddress: string,
      amountIn: BigNumber,
      gasParams: {
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        nonce: number;
      },
      provider: JsonRpcProvider
    ) {
      console.log('Creating approval transaction...');
      let estimatedGasLimit;
      try {
        estimatedGasLimit = await tokenInContract.estimateGas.approve(
          spenderAddress, 
          amountIn, 
          { from: pkp.ethAddress }
        );
        console.log("Estimated gas limit for approval:", ethers.utils.formatUnits(estimatedGasLimit, 'gwei'));
      } catch (gasEstimateError) {
        console.error("Could not estimate gas. Using fallback gas limit of 300000.", gasEstimateError);
        estimatedGasLimit = ethers.BigNumber.from("300000");
      }

      const tokenInterface = new ethers.utils.Interface([
        "function approve(address spender, uint256 amount) external returns (bool)"
      ]);

      return {
        to: tokenInContract.address,
        data: tokenInterface.encodeFunctionData("approve", [spenderAddress, amountIn]),
        value: "0x0",
        gasLimit: estimatedGasLimit.toHexString(),
        maxFeePerGas: gasParams.maxFeePerGas,
        maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
        nonce: gasParams.nonce,
        chainId: params.chainId,
        type: 2
      };
    }

    async function createSwapTx(
      routerAddress: string,
      swapParams: {
        tokenIn: string;
        tokenOut: string;
        fee: number;
        amountIn: BigNumber;
        amountOutMin: BigNumber;
      },
      gasParams: {
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        nonce: number;
      },
      provider: JsonRpcProvider
    ) {
      console.log('Creating swap transaction...');
      const routerInterface = new ethers.utils.Interface([
        "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) external payable returns (uint256)"
      ]);

      let swapGasLimit;
      try {
        const routerContract = new ethers.Contract(
          routerAddress,
          routerInterface,
          provider
        );
        
        swapGasLimit = await routerContract.estimateGas.exactInputSingle(
          [swapParams.tokenIn, swapParams.tokenOut, swapParams.fee, pkp.ethAddress, swapParams.amountIn, swapParams.amountOutMin, 0],
          { from: pkp.ethAddress }
        );
        console.log("Estimated gas limit for swap:", ethers.utils.formatUnits(swapGasLimit, 'gwei'));
        
        // Add 20% buffer to estimated gas
        swapGasLimit = swapGasLimit.mul(120).div(100);
      } catch (gasEstimateError) {
        console.error("Could not estimate swap gas. Using fallback gas limit of 500000.", gasEstimateError);
        swapGasLimit = ethers.BigNumber.from("500000");
      }

      return {
        to: routerAddress,
        data: routerInterface.encodeFunctionData("exactInputSingle", [
          [swapParams.tokenIn, swapParams.tokenOut, swapParams.fee, pkp.ethAddress, swapParams.amountIn, swapParams.amountOutMin, 0]
        ]),
        value: "0x0",
        gasLimit: swapGasLimit.toHexString(),
        maxFeePerGas: gasParams.maxFeePerGas,
        maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
        nonce: gasParams.nonce,
        chainId: params.chainId,
        type: 2
      };
    }

    async function signAndBroadcastTx(
      tx: {
        to: string;
        data: string;
        value: string;
        gasLimit: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        nonce: number;
        chainId: number;
        type: number;
      },
      sigName: string,
      chainRpcUrl: string
    ) {
      console.log('Signing transaction...');
      const sig = await Lit.Actions.signAndCombineEcdsa({
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(tx))
        ),
        publicKey: pkp.publicKey,
        sigName: sigName,
      });

      const signedTx = ethers.utils.serializeTransaction(
        tx,
        ethers.utils.joinSignature({
          r: "0x" + JSON.parse(sig).r.substring(2),
          s: "0x" + JSON.parse(sig).s,
          v: JSON.parse(sig).v,
        })
      );

      console.log('Broadcasting transaction...');
      const txHash = await Lit.Actions.runOnce(
        { waitForResponse: true, name: "txnSender" },
        async () => {
          try {
            const provider = new ethers.providers.JsonRpcProvider(chainRpcUrl);
            const receipt = await provider.sendTransaction(signedTx);
            console.log('Transaction sent:', receipt.hash);
            return receipt.hash;
          } catch (error) {
            console.error("Error broadcasting transaction:", error);
            throw error;
          }
        }
      );

      if (!ethers.utils.isHexString(txHash)) {
        throw new Error(`Invalid transaction hash: ${txHash}`);
      }

      return txHash;
    }

    async function executeApproval(
      tokenInContract: Contract,
      spenderAddress: string,
      amountIn: BigNumber,
      gasParams: {
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        nonce: number;
      },
      chainRpcUrl: string
    ) {
      console.log('Executing approval transaction...');
      const provider = new ethers.providers.JsonRpcProvider(chainRpcUrl);
      
      // Create approval transaction
      const approvalTx = await createApprovalTx(
        tokenInContract,
        spenderAddress,
        amountIn,
        gasParams,
        provider
      );

      // Sign and broadcast
      const approvalHash = await signAndBroadcastTx(
        approvalTx,
        "erc20ApprovalSig",
        chainRpcUrl
      );

      // Wait for confirmation
      console.log('Waiting for approval confirmation...');
      const approvalConfirmation = await provider.waitForTransaction(approvalHash, 1);
      if (approvalConfirmation.status === 0) {
        throw new Error("Approval transaction failed");
      }

      console.log('Approval confirmed:', approvalHash);
      return approvalHash;
    }

    async function executeSwap(
      routerAddress: string,
      swapParams: {
        tokenIn: string;
        tokenOut: string;
        fee: number;
        amountIn: BigNumber;
        amountOutMin: BigNumber;
      },
      gasParams: {
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        nonce: number;
      },
      chainRpcUrl: string
    ) {
      console.log('Executing swap transaction...');
      const provider = new ethers.providers.JsonRpcProvider(chainRpcUrl);
      
      // Create swap transaction
      const swapTx = await createSwapTx(
        routerAddress,
        swapParams,
        gasParams,
        provider
      );

      // Sign and broadcast
      const swapHash = await signAndBroadcastTx(
        swapTx,
        "erc20SwapSig",
        chainRpcUrl
      );

      console.log('Swap executed:', swapHash);
      return swapHash;
    }

    async function calculateParams(
      bestQuote: BigNumber,
      decimalsOut: number,
      provider: JsonRpcProvider,
      pkpAddress: string
    ) {
      console.log('Calculating swap parameters...');
      // Calculate slippage
      const slippageTolerance = 0.005; // 0.5%
      const amountOutMin = bestQuote.mul(1000 - (slippageTolerance * 1000)).div(1000);
      console.log("Minimum output:", ethers.utils.formatUnits(amountOutMin, decimalsOut));

      // Get gas data
      const gasData = await Lit.Actions.runOnce(
        { waitForResponse: true, name: "gasPriceGetter" },
        async () => {
          const gasData = await getGasData(provider);
          return JSON.stringify(gasData);
        }
      );

      const parsedGasData = JSON.parse(gasData);
      console.log("Gas data:", {
        maxFeePerGas: ethers.utils.formatUnits(parsedGasData.maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.utils.formatUnits(parsedGasData.maxPriorityFeePerGas, 'gwei'),
        nonce: parsedGasData.nonce
      });

      const maxFeePerGas = parsedGasData.maxFeePerGas;
      const maxPriorityFeePerGas = parsedGasData.maxPriorityFeePerGas;
      const totalGasCost = ethers.BigNumber.from(maxFeePerGas).add(ethers.BigNumber.from(maxPriorityFeePerGas));
      const nonce = parsedGasData.nonce;

      // Check ETH balance
      const ethBalance = await provider.getBalance(pkpAddress);
      if (ethBalance.lt(totalGasCost)) {
        throw new Error(
          `Insufficient ETH for gas. Have: ${ethers.utils.formatEther(ethBalance)} ETH. ` +
          `Need: ${ethers.utils.formatEther(totalGasCost)} ETH`
        );
      }

      return {
        amountOutMin,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce
      };
    }

    async function setupTokensAndValidate(
      provider: JsonRpcProvider,
      pkpAddress: string,
      chainId: number,
      params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
      }
    ) {
      console.log('Setting up tokens and validating...');
      // Check ETH balance first
      const pkpEthBalance = await provider.getBalance(pkpAddress);
      console.log(
        `Debug: PKP ETH balance on chain (${chainId}):`,
        ethers.utils.formatEther(pkpEthBalance)
      );
      if (pkpEthBalance.eq(0)) {
        console.warn("Warning: PKP has 0 ETH on this chain! It cannot pay gas.");
      }

      // Setup token interface and contracts
      const tokenInterface = new ethers.utils.Interface([
        "function decimals() view returns (uint8)",
        "function balanceOf(address account) view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
      ]);

      console.log('Creating token contract instances...');
      const tokenInContract = new ethers.Contract(
        params.tokenIn,
        tokenInterface,
        provider
      );
      const tokenOutContract = new ethers.Contract(
        params.tokenOut,
        tokenInterface,
        provider
      );

      // Get decimals and balances
      console.log('Fetching token info...');
      const [decimalsIn, decimalsOut, tokenInBalance] = await Promise.all([
        tokenInContract.decimals(),
        tokenOutContract.decimals(),
        tokenInContract.balanceOf(pkpAddress)
      ]);

      console.log('Token info:', {
        decimalsIn,
        decimalsOut,
        tokenInBalance: tokenInBalance.toString()
      });

      // Parse and validate amount
      const amountIn = ethers.utils.parseUnits(params.amountIn, decimalsIn);
      if (amountIn.gt(tokenInBalance)) {
        throw new Error(
          `Insufficient balance. PKP balance: ${ethers.utils.formatUnits(tokenInBalance, decimalsIn)}. ` + 
          `Expected at least: ${ethers.utils.formatUnits(amountIn, decimalsIn)}`
        );
      }

      return {
        tokenInContract,
        tokenOutContract,
        decimalsIn,
        decimalsOut,
        amountIn
      };
    }

    // Main Execution
    console.log('Starting Uniswap swap execution...');
    const ethersProvider = new ethers.providers.JsonRpcProvider(params.rpcUrl);

    const UNISWAP_V3_QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
    const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

    const { 
      tokenInContract,
      decimalsOut,
      amountIn 
    } = await setupTokensAndValidate(
      ethersProvider,
      pkp.ethAddress,
      params.chainId,
      params
    );

    const { quote: bestQuote, fee: bestFee } = await getBestQuote(
      ethersProvider,
      UNISWAP_V3_QUOTER,
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: amountIn
      }
    );

    const { amountOutMin, maxFeePerGas, maxPriorityFeePerGas, nonce } = await calculateParams(
      bestQuote,
      decimalsOut,
      ethersProvider,
      pkp.ethAddress
    );

    const approvalHash = await executeApproval(
      tokenInContract,
      UNISWAP_V3_ROUTER,
      amountIn,
      {
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce
      },
      params.rpcUrl
    );

    const swapHash = await executeSwap(
      UNISWAP_V3_ROUTER,
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: bestFee,
        amountIn: amountIn,
        amountOutMin: amountOutMin
      },
      {
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: nonce + 1
      },
      params.rpcUrl
    );

    console.log('Swap completed successfully');
    console.log('Approval hash:', approvalHash);
    console.log('Swap hash:', swapHash);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        approvalHash,
        swapHash,
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message,
      code: err.code,
      reason: err.reason,
      error: err.error,
      ...(err.transaction && { transaction: err.transaction }),
      ...(err.receipt && { receipt: err.receipt }),
    };

    // Construct a detailed error message
    const errorMessage = err.message || String(err);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: errorMessage,
        details: errorDetails,
      }),
    });
  }
};
