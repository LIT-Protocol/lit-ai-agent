// @ts-nocheck
// ipfs.io/ipfs/QmTGriBhEYZ7ivCLBVi9rrv2LNJzm278G75wVX93Nmw7GJ

const _safeAuthLitAction = async () => {
  try {
    const tokenId = await Lit.Actions.pubkeyToTokenId({
      publicKey: pkpPublicKey,
    });
    const owner = (await Lit.Actions.getPermittedAddresses({ tokenId }))[0];
    console.log("owner", owner);

    console.log("Checking if the owner is the Safe...");
    const isSafeOwner = owner.toLowerCase() === safeAddress.toLowerCase();
    console.log("isSafeOwner", isSafeOwner);

    if (!isSafeOwner) {
      console.log("The owner is not the Safe!");
      LitActions.setResponse({ response: "false" });
      return;
    }

    const iface = new ethers.utils.Interface([
      "function getOwners() public view returns (address[] memory)",
    ]);
    const data = iface.encodeFunctionData("getOwners", []);

    const tx = {
      to: safeAddress,
      data: data,
    };

    const serializedTx = ethers.utils.serializeTransaction(tx);

    const result = await Lit.Actions.callContract({
      chain: chainName,
      txn: serializedTx,
    });

    const [ownersArray] = iface.decodeFunctionResult("getOwners", result);

    const lowerCaseOwners = ownersArray.map((o) => o.toLowerCase());

    let validSignaturesCount = 0;
    for (const sig of signatures) {
      const recoveredAddress = ethers.utils.verifyMessage(messageToSign, sig);
      if (lowerCaseOwners.includes(recoveredAddress.toLowerCase())) {
        validSignaturesCount++;
      }
    }

    const threshold = 2;
    const isAuthorized = validSignaturesCount >= threshold;

    LitActions.setResponse({ response: isAuthorized ? "true" : "false" });
  } catch (error) {
    LitActions.setResponse({ response: error.message });
  }
};

export const litActionCustomAuth = `(${_safeAuthLitAction.toString()})();`;
