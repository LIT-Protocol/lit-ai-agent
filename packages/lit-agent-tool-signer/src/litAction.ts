declare global {
  const params: any;
  const ethers: any;
  const Lit: any;
  const pkp: any;
  const chainInfo: any;
}

export default async () => {
  try {
    // Check if we have the required parameters
    if (!params.inputString) {
      throw new Error("Missing required parameter: inputString");
    }

    // Policy Checks
    const LIT_AGENT_REGISTRY_ABI = [
      "function getActionPolicy(address user, address pkp, string calldata ipfsCid) external view returns (bool isPermitted, bytes memory description, bytes memory policy)",
    ];
    const LIT_AGENT_REGISTRY_ADDRESS =
      "0x728e8162603F35446D09961c4A285e2643f4FB91";

    // Validate auth parameters
    if (!params.user) {
      throw new Error("Missing required parameter: user");
    }
    if (!params.ipfsCid) {
      throw new Error("Missing required parameter: ipfsCid");
    }
    if (!pkp.ethAddress) {
      throw new Error("Missing required parameter: pkp.ethAddress");
    }

    // Create contract instance
    const registryContract = new ethers.Contract(
      LIT_AGENT_REGISTRY_ADDRESS,
      LIT_AGENT_REGISTRY_ABI,
      new ethers.providers.JsonRpcProvider(chainInfo.rpcUrl)
    );

    const [isPermitted, , policy] = await registryContract.getActionPolicy(
      params.user,
      pkp.ethAddress,
      params.ipfsCid
    );

    if (!isPermitted) {
      throw new Error("Action not permitted for this PKP");
    }

    // Decode the policy
    const policyStruct = ["tuple(bool allowAll)"];
    let decodedPolicy;
    try {
      decodedPolicy = ethers.utils.defaultAbiCoder.decode(
        policyStruct,
        policy
      )[0];

      if (!decodedPolicy.allowAll) {
        throw new Error("Signing is not allowed by policy");
      }
    } catch (error) {
      throw new Error(
        `Failed to decode policy: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Sign the message
    const signature = await Lit.Actions.signEcdsa({
      toSign: ethers.utils.arrayify(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(params.inputString))
      ),
      publicKey: pkp.publicKey,
      sigName: "sig",
    });

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "success",
      }),
    });
  } catch (error) {
    console.error("Error:", error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }),
    });
  }
};
