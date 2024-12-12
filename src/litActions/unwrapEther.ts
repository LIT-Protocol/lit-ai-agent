// @ts-nocheck
// ipfs.io/ipfs/QmSNtQAbYLc5pDrGEjAeUqaih1657V7ht4RJe2mwKBrmWQ

const _litActionCode = async () => {
  try {
    const WETH = "0x4200000000000000000000000000000000000006";
    const ethersProvider = new ethers.providers.JsonRpcProvider(
      chainInfo.rpcUrl
    );

    const amountIn = ethers.utils.parseUnits(params.amountIn, 18);

    const maxAmount = ethers.utils.parseUnits("0.001", 18);
    if (amountIn.gt(maxAmount)) {
      LitActions.setResponse({ response: "Requested unwrap amount too large" });
      throw new Error("Requested unwrap amount too large");
    }

    const wethInterface = new ethers.utils.Interface([
      "function withdraw(uint256 wad) external",
    ]);

    const unsignedTransaction = {
      to: WETH,
      data: wethInterface.encodeFunctionData("withdraw", [amountIn]),
      value: "0x0",
      gasLimit: ethers.utils.hexlify(100000),
      gasPrice: (await ethersProvider.getGasPrice()).mul(2).toHexString(),
      nonce: await ethersProvider.getTransactionCount(pkpEthAddress),
      chainId: chainInfo.chainId,
    };

    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign: ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.serializeTransaction(unsignedTransaction)
        )
      ),
      publicKey,
      sigName: "unwrap_sig",
    });

    const signedTx = ethers.utils.serializeTransaction(
      unsignedTransaction,
      ethers.utils.joinSignature({
        r: "0x" + JSON.parse(signature).r.substring(2),
        s: "0x" + JSON.parse(signature).s,
        v: JSON.parse(signature).v,
      })
    );

    const unwrapResponse = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(
            chainInfo.rpcUrl
          );
          const unwrapReceipt = await provider.sendTransaction(signedTx);
          return unwrapReceipt.hash;
        } catch (error) {
          throw error;
        }
      }
    );

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        unwrapHash: unwrapResponse,
      }),
    });
  } catch (error) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "error",
        error: error.message,
      }),
    });
  }
};

export const litActionUnwrap = `(${_litActionCode.toString()})();`;
