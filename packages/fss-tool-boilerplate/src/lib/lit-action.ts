declare global {
    // Injected By Lit
    const Lit: any;
    const LitAuth: any;
    const ethers: {
      providers: {
        JsonRpcProvider: any;
      };
      utils: {
        Interface: any;
        parseUnits: any;
        defaultAbiCoder: any;
        keccak256: any;
        toUtf8Bytes: any;
        arrayify: any;
      };
      Wallet: any;
      Contract: any;
    };
  
    const pkp: {
      ethAddress: string;
      publicKey: string;
    };
  
    // Required Inputs
    const params: {
      message: string;
    };
  }
  
  export default async () => {
    try {
      // Validate message against policy
      await validatePolicy(params.message);
  
      async function signMessage(message: string) {
        // Hash the message
  
        const messageArray = ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))
        );
  
        const signature = await Lit.Actions.signEcdsa({
          toSign: messageArray,
          publicKey: pkp.publicKey,
          sigName: "sig",
        });
  
        return signature;
      }
  
      // Sign the message
      const signature = await signMessage(params.message);
  
      // Return the signature
      Lit.Actions.setResponse({
        response: JSON.stringify({
          response: signature,
          status: 'success',
        }),
      });
    } catch (err: any) {
      console.error('Error:', err);
      Lit.Actions.setResponse({
        response: JSON.stringify({
          status: 'error',
          error: err.message || String(err),
        }),
      });
    }
  };
  
  
  async function validatePolicy(message: string) {
    try {
      // Tool policy registry contract
      const TOOL_POLICY_ABI = [
        'function getActionPolicy(address pkp, string calldata ipfsCid) external view returns (bytes memory policy, string memory version)',
      ];
  
      // Create contract instance
      const TOOL_POLICY_REGISTRY = '0xD78e1C1183A29794A092dDA7dB526A91FdE36020';
      
      const policyProvider = new ethers.providers.JsonRpcProvider(
        await Lit.Actions.getRpcUrl({
          chain: 'yellowstone',
        })
      );
      console.log('policyProvider', policyProvider);
      const policyContract = new ethers.Contract(
        TOOL_POLICY_REGISTRY,
        TOOL_POLICY_ABI,
        policyProvider
      );
      console.log('policyContract', policyContract);
      // Get policy for this tool
      const TOOL_IPFS_CID = LitAuth.actionIpfsIds[0];
      console.log('TOOL_IPFS_CID', TOOL_IPFS_CID);
      const [policyData] = await policyContract.getActionPolicy(
        pkp.ethAddress,
        TOOL_IPFS_CID
      );
      console.log('policyData', policyData);
  
      // Decode policy
      const decodedPolicy = ethers.utils.defaultAbiCoder.decode(
        ['tuple(string[] allowedMessagePrefixes)'],
        policyData
      )[0];
      console.log('decodedPolicy', decodedPolicy);
      // If no prefixes are specified, all messages are allowed
  
      } catch (err: any) {
      console.error('Policy validation error:', err);
      if (err.code === 'CALL_EXCEPTION') {
        throw new Error('Failed to fetch policy from registry contract');
      } else {
        throw new Error(`Failed to validate policy: ${err.message || String(err)}`);
      }
    }
  }
  