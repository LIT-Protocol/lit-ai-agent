// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LitAgentRegistry
 * @dev Registry for managing PKP-specific Lit Action policies. Each user can register PKPs
 * and set custom policies for each Lit Action that the PKP is allowed to execute.
 * 
 * Each Lit Action has:
 * 1. A description - Required system field used by the LLM to match user intents with actions
 * 2. A policy - Tool-specific configuration bytes that can be empty or in any format required by the tool
 */
contract LitAgentRegistry {
    /**
     * @dev Stores the policy and metadata for a specific Lit Action
     * @param isPermitted Whether the action is currently permitted
     * @param description Human-readable description of what this Lit Action does (e.g., "Swap ETH for USDC on Uniswap")
     * @param policy Tool-specific configuration bytes
     */
    struct ActionPolicy {
        bool isPermitted;
        bytes description;  // Required field for LLM matching, stored as bytes for gas savings
        bytes policy;      // Tool-specific configuration bytes
    }

    /**
     * @dev Configuration for a specific PKP, including all its permitted actions
     * @param isRegistered Whether this PKP has been registered
     * @param actionPolicies Mapping from Lit Action IPFS CID to its policy
     * @param registeredActions List of all IPFS CIDs registered for this PKP
     */
    struct PKPConfig {
        bool isRegistered;
        mapping(string => ActionPolicy) actionPolicies;  // ipfsCid -> policy
        string[] registeredActions;                      // Array of registered IPFS CIDs
    }

    /// @dev Maps user address -> PKP address -> PKP configuration
    mapping(address => mapping(address => PKPConfig)) public pkpConfigs;
    
    /// @dev Emitted when a new PKP is registered
    event PKPRegistered(address indexed user, address indexed pkp);

    /// @dev Emitted when an action policy is set or updated
    event ActionPolicySet(
        address indexed user,
        address indexed pkp,
        string ipfsCid,
        bytes description,
        bytes policy
    );

    /// @dev Emitted when an action policy is removed
    event ActionPolicyRemoved(
        address indexed user,
        address indexed pkp,
        string ipfsCid
    );

    /**
     * @dev Register a new PKP for the caller
     * @param pkp Address of the PKP to register
     * @notice A PKP must be registered before setting any action policies
     */
    function registerPKP(address pkp) external {
        require(!pkpConfigs[msg.sender][pkp].isRegistered, "PKP already registered");
        pkpConfigs[msg.sender][pkp].isRegistered = true;
        emit PKPRegistered(msg.sender, pkp);
    }

    /**
     * @dev Set or update a policy for a specific Lit Action
     * @param pkp Address of the PKP
     * @param ipfsCid IPFS CID of the Lit Action
     * @param description Human-readable description of what this Lit Action does
     * @param policy Tool-specific policy bytes (can be empty or in any format required by the tool)
     * @notice The description is required and used by the LLM for action matching
     */
    function setActionPolicy(
        address pkp,
        string calldata ipfsCid,
        bytes calldata description,
        bytes calldata policy
    ) external {
        require(pkpConfigs[msg.sender][pkp].isRegistered, "PKP not registered");
        require(description.length > 0, "Description is required");
        
        PKPConfig storage config = pkpConfigs[msg.sender][pkp];
        ActionPolicy storage actionPolicy = config.actionPolicies[ipfsCid];
        
        // If this is a new action, add it to the list
        if (!actionPolicy.isPermitted) {
            config.registeredActions.push(ipfsCid);
        }
        
        actionPolicy.isPermitted = true;
        actionPolicy.description = description;
        actionPolicy.policy = policy;
        
        emit ActionPolicySet(msg.sender, pkp, ipfsCid, description, policy);
    }

    /**
     * @dev Remove a policy for a specific Lit Action
     * @param pkp Address of the PKP
     * @param ipfsCid IPFS CID of the Lit Action to remove
     * @notice This will both disable the action and delete its policy
     */
    function removeActionPolicy(address pkp, string calldata ipfsCid) external {
        require(pkpConfigs[msg.sender][pkp].isRegistered, "PKP not registered");
        
        PKPConfig storage config = pkpConfigs[msg.sender][pkp];
        delete config.actionPolicies[ipfsCid].isPermitted;
        delete config.actionPolicies[ipfsCid].description;
        delete config.actionPolicies[ipfsCid].policy;
        
        // Remove from registeredActions array
        for (uint i = 0; i < config.registeredActions.length; i++) {
            if (keccak256(bytes(config.registeredActions[i])) == keccak256(bytes(ipfsCid))) {
                // Move last element to current position and pop
                config.registeredActions[i] = config.registeredActions[config.registeredActions.length - 1];
                config.registeredActions.pop();
                break;
            }
        }
        
        emit ActionPolicyRemoved(msg.sender, pkp, ipfsCid);
    }

    /**
     * @dev Get the policy for a specific Lit Action
     * @param user Address of the user who owns the PKP
     * @param pkp Address of the PKP
     * @param ipfsCid IPFS CID of the Lit Action
     * @return isPermitted Whether the action is permitted
     * @return description Human-readable description of what this action does
     * @return policy The ABI encoded policy struct
     */
    function getActionPolicy(
        address user,
        address pkp,
        string calldata ipfsCid
    ) external view returns (bool isPermitted, bytes memory description, bytes memory policy) {
        require(pkpConfigs[user][pkp].isRegistered, "PKP not registered");
        ActionPolicy storage actionPolicy = pkpConfigs[user][pkp].actionPolicies[ipfsCid];
        return (actionPolicy.isPermitted, actionPolicy.description, actionPolicy.policy);
    }

    /**
     * @dev Get all registered actions and their policies for a PKP
     * @param user Address of the user who owns the PKP
     * @param pkp Address of the PKP
     * @return ipfsCids Array of IPFS CIDs for registered actions
     * @return descriptions Array of action descriptions (in same order as ipfsCids)
     * @return policies Array of ABI encoded policy structs (in same order as ipfsCids)
     */
    function getRegisteredActions(address user, address pkp)
        external
        view
        returns (
            string[] memory ipfsCids,
            bytes[] memory descriptions,
            bytes[] memory policies
        )
    {
        require(pkpConfigs[user][pkp].isRegistered, "PKP not registered");
        
        PKPConfig storage config = pkpConfigs[user][pkp];
        uint256 length = config.registeredActions.length;
        
        ipfsCids = new string[](length);
        descriptions = new bytes[](length);
        policies = new bytes[](length);
        
        for (uint256 i = 0; i < length; i++) {
            string memory ipfsCid = config.registeredActions[i];
            ActionPolicy storage policy = config.actionPolicies[ipfsCid];
            
            ipfsCids[i] = ipfsCid;
            descriptions[i] = policy.description;
            policies[i] = policy.policy;
        }
        
        return (ipfsCids, descriptions, policies);
    }
}
