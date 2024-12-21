// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PKPTools {
    address public immutable safeAddress;

    struct Action {
        bool permitted;
        string description;
        bool exists;
    }

    mapping(string => Action) public permittedActions;
    string[] public actionCIDs;

    event ActionPermissionSet(string indexed ipfsCid, bool permitted, string description);
    event ActionRemoved(string indexed ipfsCid);

    constructor(address _safeAddress) {
        safeAddress = _safeAddress;
    }

    modifier onlySafe() {
        require(msg.sender == safeAddress, "Only Safe can call this");
        _;
    }

    function setPermittedAction(string calldata ipfsCid, bool permitted, string calldata description)
        external
        onlySafe
    {
        if (!permittedActions[ipfsCid].exists) {
            actionCIDs.push(ipfsCid);
        }
        permittedActions[ipfsCid] = Action(permitted, description, true);
        emit ActionPermissionSet(ipfsCid, permitted, description);
    }

    function removePermittedAction(string calldata ipfsCid) external onlySafe {
        require(permittedActions[ipfsCid].exists, "Action does not exist");

        // Remove from actionCIDs array
        for (uint256 i = 0; i < actionCIDs.length; i++) {
            if (keccak256(bytes(actionCIDs[i])) == keccak256(bytes(ipfsCid))) {
                // Move the last element to the position being deleted
                actionCIDs[i] = actionCIDs[actionCIDs.length - 1];
                // Remove the last element
                actionCIDs.pop();
                break;
            }
        }

        // Remove from mapping
        delete permittedActions[ipfsCid];
        emit ActionRemoved(ipfsCid);
    }

    function removeAllPermittedActions() external onlySafe {
        for (uint256 i = actionCIDs.length; i > 0; i--) {
            string memory cid = actionCIDs[i - 1];
            delete permittedActions[cid];
            emit ActionRemoved(cid);
        }
        delete actionCIDs;
    }

    function isPermittedAction(string calldata ipfsCid) external view returns (bool) {
        return permittedActions[ipfsCid].permitted;
    }

    function getAllPermittedActions()
        external
        view
        returns (string[] memory cids, bool[] memory permissions, string[] memory descriptions)
    {
        // Count actually permitted actions
        uint256 count = 0;
        for (uint256 i = 0; i < actionCIDs.length; i++) {
            if (permittedActions[actionCIDs[i]].permitted) {
                count++;
            }
        }

        // Create arrays of correct size
        cids = new string[](count);
        permissions = new bool[](count);
        descriptions = new string[](count);

        // Fill arrays only with permitted actions
        uint256 index = 0;
        for (uint256 i = 0; i < actionCIDs.length; i++) {
            string memory cid = actionCIDs[i];
            Action memory action = permittedActions[cid];
            if (action.permitted) {
                cids[index] = cid;
                permissions[index] = true;
                descriptions[index] = action.description;
                index++;
            }
        }

        return (cids, permissions, descriptions);
    }
}
