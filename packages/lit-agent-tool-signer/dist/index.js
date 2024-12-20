
export const signerLitActionDescription = "Lit Action for signing arbitrary messages";

export const signerLitAction = "(async () => {\n  try {\n    if (!params.inputString) {\n      throw new Error(\"Missing required parameter: inputString\");\n    }\n    const LIT_AGENT_REGISTRY_ABI = [\n      \"function getActionPolicy(address user, address pkp, string calldata ipfsCid) external view returns (bool isPermitted, bytes memory description, bytes memory policy)\"\n    ];\n    const LIT_AGENT_REGISTRY_ADDRESS = \"0x728e8162603F35446D09961c4A285e2643f4FB91\";\n    if (!params.user) {\n      throw new Error(\"Missing required parameter: user\");\n    }\n    if (!params.ipfsCid) {\n      throw new Error(\"Missing required parameter: ipfsCid\");\n    }\n    if (!pkp.ethAddress) {\n      throw new Error(\"Missing required parameter: pkp.ethAddress\");\n    }\n    const registryContract = new ethers.Contract(\n      LIT_AGENT_REGISTRY_ADDRESS,\n      LIT_AGENT_REGISTRY_ABI,\n      new ethers.providers.JsonRpcProvider(chainInfo.rpcUrl)\n    );\n    const [isPermitted, , policy] = await registryContract.getActionPolicy(\n      params.user,\n      pkp.ethAddress,\n      params.ipfsCid\n    );\n    if (!isPermitted) {\n      throw new Error(\"Action not permitted for this PKP\");\n    }\n    const policyStruct = [\"tuple(bool allowAll)\"];\n    let decodedPolicy;\n    try {\n      decodedPolicy = ethers.utils.defaultAbiCoder.decode(policyStruct, policy)[0];\n      if (!decodedPolicy.allowAll) {\n        throw new Error(\"Signing is not allowed by policy\");\n      }\n    } catch (error) {\n      throw new Error(\n        `Failed to decode policy: ${error instanceof Error ? error.message : String(error)}`\n      );\n    }\n    const signature = await Lit.Actions.signEcdsa({\n      toSign: ethers.utils.arrayify(\n        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(params.inputString))\n      ),\n      publicKey: pkp.publicKey,\n      sigName: \"sig\"\n    });\n    Lit.Actions.setResponse({\n      response: JSON.stringify({\n        status: \"success\"\n      })\n    });\n  } catch (error) {\n    console.error(\"Error:\", error);\n    Lit.Actions.setResponse({\n      response: JSON.stringify({\n        status: \"error\",\n        error: error.message\n      })\n    });\n  }\n})();";

export const signerMetadata = {
  signerLitAction: {
    IpfsHash: "Qmd2m3ZLjCMe262y9CnReNHfb3SG5jmNNumYrFG3StjVNh",
    PinSize: 2110,
    Timestamp: "2024-12-20T06:14:56.434Z",
    isDuplicate: true,
    Duration: 0.537
  }
};

export * from "./policy";
