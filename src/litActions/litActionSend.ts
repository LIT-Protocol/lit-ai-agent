// @ts-nocheck
// ipfs.io/ipfs/QmXjLSxsTx3fXeW6QjhuqbL2em3csRc3tWJBYCMtw6p7Pq

const _litActionCode = async () => {
  try {
    const ethersProvider = new ethers.providers.JsonRpcProvider(
      chainInfo.rpcUrl
    );

    const amountIn = ethers.utils.parseUnits(params.amountIn, 18);

    const maxAmount = ethers.utils.parseUnits("0.001", 18);
    if (amountIn.gt(maxAmount)) {
      LitActions.setResponse({ response: "Requested send amount too large" });
      throw new Error("Requested send amount too large");
    }

    const permittedAddresses = [
      "0xF9B6C15729958BF84683F49B7bb847729bA36DC9", // Trusted Wallet
    ];

    if (!permittedAddresses.includes(params.recipientAddress)) {
      LitActions.setResponse({ response: "Recipient address not permitted" });
      throw new Error("Recipient address not permitted");
    }

    const unsignedTransaction = {
      to: params.recipientAddress,
      value: amountIn,
      gasLimit: ethers.utils.hexlify(50000),
      gasPrice: (await ethersProvider.getGasPrice()).toHexString(),
      nonce: await ethersProvider.getTransactionCount(pkpEthAddress),
      chainId: chainInfo.chainId,
    };

    const toSign = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.serializeTransaction(unsignedTransaction)
      )
    );

    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign,
      publicKey,
      sigName: "sendEtherSig",
    });

    const jsonSignature = JSON.parse(signature);
    jsonSignature.r = "0x" + jsonSignature.r.substring(2);
    jsonSignature.s = "0x" + jsonSignature.s;
    const hexSignature = ethers.utils.joinSignature(jsonSignature);

    const signedTx = ethers.utils.serializeTransaction(
      unsignedTransaction,
      ethers.utils.joinSignature({
        r: "0x" + JSON.parse(signature).r.substring(2),
        s: "0x" + JSON.parse(signature).s,
        v: JSON.parse(signature).v,
      })
    );

    const sendResponse = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "txnSender" },
      async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider(
            chainInfo.rpcUrl
          );
          const sendReceipt = await provider.sendTransaction(signedTx);
          return sendReceipt.hash;
        } catch (error) {
          throw error;
        }
      }
    );

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
        sendHash: sendResponse,
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

export const litActionSend = `(${_litActionCode.toString()})();`;
