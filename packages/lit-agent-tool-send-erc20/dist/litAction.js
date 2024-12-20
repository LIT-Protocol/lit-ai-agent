(async () => {
  try {
    const ethersProvider = new ethers.providers.JsonRpcProvider(
      chainInfo.rpcUrl
    );
    const LIT_AGENT_REGISTRY_ABI = [
      "function getActionPolicy(address user, address pkp, string calldata ipfsCid) external view returns (bool isPermitted, bytes memory description, bytes memory policy)"
    ];
    const LIT_AGENT_REGISTRY_ADDRESS = "0x728e8162603F35446D09961c4A285e2643f4FB91";
    if (!LitAuth.authSigAddress) {
      throw new Error("Missing required parameter: LitAuth.authSigAddress");
    }
    if (!LitAuth.actionIpfsIds[0]) {
      throw new Error("Missing required parameter: LitAuth.actionIpfsIds[0]");
    }
    if (!pkp.ethAddress) {
      throw new Error("Missing required parameter: pkp.ethAddress");
    }
    const registryContract = new ethers.Contract(
      LIT_AGENT_REGISTRY_ADDRESS,
      LIT_AGENT_REGISTRY_ABI,
      ethersProvider
    );
    const [isPermitted, , policy] = await registryContract.getActionPolicy(
      LitAuth.authSigAddress,
      pkp.ethAddress,
      LitAuth.actionIpfsIds[0]
    );
    if (!isPermitted) {
      throw new Error("Action not permitted for this PKP");
    }
    const policyStruct = ["tuple(uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)"];
    let decodedPolicy;
    try {
      decodedPolicy = ethers.utils.defaultAbiCoder.decode(policyStruct, policy)[0];
      if (!decodedPolicy.maxAmount || !decodedPolicy.allowedTokens || !decodedPolicy.allowedRecipients) {
        throw new Error("Invalid policy format: missing required fields");
      }
      decodedPolicy.allowedTokens = decodedPolicy.allowedTokens.map(
        (token) => ethers.utils.getAddress(token)
      );
      decodedPolicy.allowedRecipients = decodedPolicy.allowedRecipients.map(
        (recipient) => ethers.utils.getAddress(recipient)
      );
    } catch (error) {
      throw new Error(
        `Failed to decode policy: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const normalizedTokenAddress = ethers.utils.getAddress(params.tokenIn);
    const normalizedRecipientAddress = ethers.utils.getAddress(params.recipientAddress);
    if (!decodedPolicy.allowedTokens.includes(normalizedTokenAddress)) {
      throw new Error(`Token not allowed: ${normalizedTokenAddress}`);
    }
    if (!decodedPolicy.allowedRecipients.includes(normalizedRecipientAddress)) {
      throw new Error(`Recipient not allowed: ${normalizedRecipientAddress}`);
    }
    const tokenInterface = new ethers.utils.Interface([
      "function decimals() view returns (uint8)",
      "function balanceOf(address account) view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ]);
    const tokenContract = new ethers.Contract(
      params.tokenIn,
      tokenInterface,
      ethersProvider
    );
    const [decimals, balance] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.balanceOf(pkp.ethAddress)
    ]);
    const amount = ethers.utils.parseUnits(params.amountIn, decimals);
    if (amount.gt(decodedPolicy.maxAmount)) {
      throw new Error(
        `Amount exceeds policy limit. Max allowed: ${ethers.utils.formatUnits(decodedPolicy.maxAmount, decimals)}`
      );
    }
    if (amount.gt(balance)) {
      throw new Error(
        `Insufficient balance. PKP balance: ${ethers.utils.formatUnits(balance, decimals)}. Required: ${ethers.utils.formatUnits(amount, decimals)}`
      );
    }
    const gasData = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "gasPriceGetter" },
      async () => {
        const provider = new ethers.providers.JsonRpcProvider(chainInfo.rpcUrl);
        const baseFeeHistory = await provider.send("eth_feeHistory", ["0x1", "latest", []]);
        const baseFee = ethers.BigNumber.from(baseFeeHistory.baseFeePerGas[0]);
        const nonce2 = await provider.getTransactionCount(pkp.ethAddress);
        const priorityFee = baseFee.div(4);
        const maxFee = baseFee.mul(2);
        return JSON.stringify({
          maxFeePerGas: maxFee.toHexString(),
          maxPriorityFeePerGas: priorityFee.toHexString(),
          nonce: nonce2
        });
      }
    );
    const parsedGasData = JSON.parse(gasData);
    const { maxFeePerGas, maxPriorityFeePerGas, nonce } = parsedGasData;
    let estimatedGasLimit;
    try {
      estimatedGasLimit = await tokenContract.estimateGas.transfer(
        params.recipientAddress,
        amount,
        { from: pkp.ethAddress }
      );
      console.log("Estimated gas limit:", estimatedGasLimit.toString());
      estimatedGasLimit = estimatedGasLimit.mul(120).div(100);
    } catch (error) {
      console.error("Could not estimate gas. Using fallback gas limit of 100000.", error);
      estimatedGasLimit = ethers.BigNumber.from("100000");
    }
    const transferTx = {
      to: params.tokenIn,
      data: tokenInterface.encodeFunctionData("transfer", [
        params.recipientAddress,
        amount
      ]),
      value: "0x0",
      gasLimit: estimatedGasLimit.toHexString(),
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      chainId: chainInfo.chainId,
      type: 2
    };
    console.log("Signing transfer...");
    const transferSig = await Lit.Actions.signAndCombineEcdsa({
      toSign: ethers.utils.arrayify(
        ethers.utils.keccak256(ethers.utils.serializeTransaction(transferTx))
      ),
      publicKey: pkp.publicKey,
      sigName: "erc20TransferSig"
    });
    const signedTransferTx = ethers.utils.serializeTransaction(
      transferTx,
      ethers.utils.joinSignature({
        r: "0x" + JSON.parse(transferSig).r.substring(2),
        s: "0x" + JSON.parse(transferSig).s,
        v: JSON.parse(transferSig).v
      })
    );
    console.log("Broadcasting transfer...");
    const transferHash = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(chainInfo.rpcUrl);
          const receipt = await provider.sendTransaction(signedTransferTx);
          return receipt.hash;
        } catch (error) {
          console.error("Error sending transfer:", error);
          throw error;
        }
      }
    );
    if (!ethers.utils.isHexString(transferHash)) {
      throw new Error(`Invalid transaction hash: ${transferHash}`);
    }
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        transferHash
      })
    });
  } catch (error) {
    console.error("Error:", error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "error",
        error: error.message
      })
    });
  }
})();