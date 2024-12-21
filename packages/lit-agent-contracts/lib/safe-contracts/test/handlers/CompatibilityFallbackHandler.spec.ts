import { buildContractSignature } from "./../../src/utils/execution";
import { expect } from "chai";
import hre from "hardhat";
import { AddressZero } from "@ethersproject/constants";
import { getCompatFallbackHandler, getSafe } from "../utils/setup";
import {
    buildSignatureBytes,
    executeContractCallWithSigners,
    calculateSafeMessageHash,
    preimageSafeMessageHash,
    EIP712_SAFE_MESSAGE_TYPE,
    signHash,
} from "../../src/utils/execution";
import { chainId } from "../utils/encoding";
import { killLibContract } from "../utils/contracts";

describe("CompatibilityFallbackHandler", () => {
    const setupTests = hre.deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();
        const [user1, user2] = await hre.ethers.getSigners();
        const signLib = await (await hre.ethers.getContractFactory("SignMessageLib")).deploy();
        const handler = await getCompatFallbackHandler();
        const compatFallbackHandlerAddress = await handler.getAddress();
        const signerSafe = await getSafe({ owners: [user1.address], threshold: 1, fallbackHandler: compatFallbackHandlerAddress });
        const signerSafeAddress = await signerSafe.getAddress();
        const safe = await getSafe({
            owners: [user1.address, user2.address, signerSafeAddress],
            threshold: 2,
            fallbackHandler: compatFallbackHandlerAddress,
        });
        const safeAddress = await safe.getAddress();
        const validator = await getCompatFallbackHandler(safeAddress);
        const killLib = await killLibContract(user1, hre.network.zksync);
        return {
            safe,
            validator,
            handler,
            killLib,
            signLib,
            signerSafe,
            user1,
            user2,
        };
    });

    describe("ERC1155", async () => {
        it("to handle onERC1155Received", async () => {
            const { handler } = await setupTests();
            await expect(await handler.onERC1155Received.staticCall(AddressZero, AddressZero, 0, 0, "0x")).to.be.eq("0xf23a6e61");
        });

        it("to handle onERC1155BatchReceived", async () => {
            const { handler } = await setupTests();
            await expect(await handler.onERC1155BatchReceived.staticCall(AddressZero, AddressZero, [], [], "0x")).to.be.eq("0xbc197c81");
        });
    });

    describe("ERC721", async () => {
        it("to handle onERC721Received", async () => {
            const { handler } = await setupTests();
            await expect(await handler.onERC721Received.staticCall(AddressZero, AddressZero, 0, "0x")).to.be.eq("0x150b7a02");
        });
    });

    describe("ERC777", async () => {
        it("to handle tokensReceived", async () => {
            const { handler } = await setupTests();
            await handler.tokensReceived.staticCall(AddressZero, AddressZero, AddressZero, 0, "0x", "0x");
        });
    });

    describe("isValidSignature(bytes,bytes)", async () => {
        it("should revert if called directly", async () => {
            const { handler } = await setupTests();
            await expect(handler["isValidSignature(bytes,bytes)"].staticCall("0xbaddad", "0x")).to.be.reverted;
        });

        it("should revert if message was not signed", async () => {
            const { validator } = await setupTests();
            await expect(validator["isValidSignature(bytes,bytes)"].staticCall("0xbaddad", "0x")).to.be.revertedWith("Hash not approved");
        });

        it("should revert if signature is not valid", async () => {
            const { validator } = await setupTests();
            await expect(validator["isValidSignature(bytes,bytes)"].staticCall("0xbaddad", "0xdeaddeaddeaddead")).to.be.reverted;
        });

        it("should return magic value if message was signed", async () => {
            const { safe, validator, signLib, user1, user2 } = await setupTests();
            await executeContractCallWithSigners(safe, signLib, "signMessage", ["0xbaddad"], [user1, user2], true);
            expect(await validator["isValidSignature(bytes,bytes)"].staticCall("0xbaddad", "0x")).to.be.eq("0x20c13b0b");
        });

        it("should return magic value if enough owners signed and allow a mix different signature types", async () => {
            const { validator, signerSafe, user1, user2 } = await setupTests();
            const signerSafeAddress = await signerSafe.getAddress();
            const validatorAddress = await validator.getAddress();
            const sig1 = {
                signer: user1.address,
                data: await user1.signTypedData(
                    { verifyingContract: validatorAddress, chainId: await chainId() },
                    EIP712_SAFE_MESSAGE_TYPE,
                    { message: "0xbaddad" },
                ),
            };
            const sig2 = await signHash(user2, calculateSafeMessageHash(validatorAddress, "0xbaddad", await chainId()));
            const validatorPreImageMessage = preimageSafeMessageHash(validatorAddress, "0xbaddad", await chainId());
            const signerSafeMessageHash = calculateSafeMessageHash(signerSafeAddress, validatorPreImageMessage, await chainId());
            const signerSafeOwnerSignature = await signHash(user1, signerSafeMessageHash);
            const signerSafeSig = buildContractSignature(signerSafeAddress, signerSafeOwnerSignature.data);

            expect(
                await validator["isValidSignature(bytes,bytes)"].staticCall("0xbaddad", buildSignatureBytes([sig1, sig2, signerSafeSig])),
            ).to.be.eq("0x20c13b0b");
        });
    });

    describe("isValidSignature(bytes32,bytes)", async () => {
        it("should revert if called directly", async () => {
            const { handler } = await setupTests();
            const dataHash = hre.ethers.keccak256("0xbaddad");
            await expect(handler["isValidSignature(bytes32,bytes)"].staticCall(dataHash, "0x")).to.be.reverted;
        });

        it("should revert if message was not signed", async () => {
            const { validator } = await setupTests();
            const dataHash = hre.ethers.keccak256("0xbaddad");
            await expect(validator["isValidSignature(bytes32,bytes)"].staticCall(dataHash, "0x")).to.be.revertedWith("Hash not approved");
        });

        it("should revert if signature is not valid", async () => {
            const { validator } = await setupTests();
            const dataHash = hre.ethers.keccak256("0xbaddad");
            await expect(validator["isValidSignature(bytes32,bytes)"].staticCall(dataHash, "0xdeaddeaddeaddead")).to.be.reverted;
        });

        it("should return magic value if message was signed", async () => {
            const { safe, validator, signLib, user1, user2 } = await setupTests();
            const dataHash = hre.ethers.keccak256("0xbaddad");
            await executeContractCallWithSigners(safe, signLib, "signMessage", [dataHash], [user1, user2], true);
            expect(await validator["isValidSignature(bytes32,bytes)"].staticCall(dataHash, "0x")).to.be.eq("0x1626ba7e");
        });

        it("should return magic value if enough owners signed and allow a mix different signature types", async () => {
            const { validator, signerSafe, user1, user2 } = await setupTests();
            const validatorAddress = await validator.getAddress();
            const dataHash = hre.ethers.keccak256("0xbaddad");
            const typedDataSig = {
                signer: user1.address,
                data: await user1.signTypedData(
                    { verifyingContract: validatorAddress, chainId: await chainId() },
                    EIP712_SAFE_MESSAGE_TYPE,
                    { message: dataHash },
                ),
            };
            const ethSignSig = await signHash(user2, calculateSafeMessageHash(validatorAddress, dataHash, await chainId()));
            const validatorPreImageMessage = preimageSafeMessageHash(validatorAddress, dataHash, await chainId());
            const signerSafeAddress = await signerSafe.getAddress();
            const signerSafeMessageHash = calculateSafeMessageHash(signerSafeAddress, validatorPreImageMessage, await chainId());
            const signerSafeOwnerSignature = await signHash(user1, signerSafeMessageHash);
            const signerSafeSig = buildContractSignature(signerSafeAddress, signerSafeOwnerSignature.data);

            expect(
                await validator["isValidSignature(bytes32,bytes)"].staticCall(
                    dataHash,
                    buildSignatureBytes([typedDataSig, ethSignSig, signerSafeSig]),
                ),
            ).to.be.eq("0x1626ba7e");
        });
    });

    describe("getModules", async () => {
        it("returns enabled modules", async () => {
            const { safe, validator, user1, user2 } = await setupTests();
            await expect(executeContractCallWithSigners(safe, safe, "enableModule", [user2.address], [user1, user2]))
                .to.emit(safe, "EnabledModule")
                .withArgs(user2.address);

            await expect(await safe.isModuleEnabled(user2.address)).to.be.true;

            await expect(await validator.getModules()).to.be.deep.equal([user2.address]);
        });
    });

    describe("getMessageHash", async () => {
        it("should generate the correct hash", async () => {
            const { safe, validator } = await setupTests();
            const safeAddress = await safe.getAddress();
            expect(await validator.getMessageHash("0xdead")).to.be.eq(calculateSafeMessageHash(safeAddress, "0xdead", await chainId()));
        });
    });

    describe("getMessageHashForSafe", async () => {
        it("should revert if target does not return domain separator", async () => {
            const { handler } = await setupTests();
            const handlerAddress = await handler.getAddress();
            await expect(handler.getMessageHashForSafe(handlerAddress, "0xdead")).to.be.reverted;
        });

        it("should generate the correct hash", async () => {
            const { handler, safe } = await setupTests();
            const safeAddress = await safe.getAddress();
            expect(await handler.getMessageHashForSafe(safeAddress, "0xdead")).to.be.eq(
                calculateSafeMessageHash(safeAddress, "0xdead", await chainId()),
            );
        });
    });

    describe("simulate", async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        it.skip("can be called for any Safe", async () => {});

        it("should revert changes", async function () {
            /**
             * ## Test not applicable for zkSync, therefore should skip.
             * The `SELFDESTRUCT` instruction is not supported
             * @see https://era.zksync.io/docs/reference/architecture/differences-with-ethereum.html#selfdestruct
             */
            if (hre.network.zksync) this.skip();

            const { validator, killLib } = await setupTests();
            const validatorAddress = await validator.getAddress();
            const code = await hre.ethers.provider.getCode(validatorAddress);
            const killLibAddress = await killLib.getAddress();
            expect(await validator.simulate.staticCall(killLibAddress, killLib.interface.encodeFunctionData("killme"))).to.be.eq("0x");
            expect(await hre.ethers.provider.getCode(validatorAddress)).to.be.eq(code);
        });

        it("should return result", async () => {
            const { validator, killLib, handler } = await setupTests();
            const handlerAddress = await handler.getAddress();
            const killLibAddress = await killLib.getAddress();
            expect(await validator.simulate.staticCall(killLibAddress, killLib.interface.encodeFunctionData("expose"))).to.be.eq(
                "0x000000000000000000000000" + handlerAddress.slice(2).toLowerCase(),
            );
        });

        it("should propagate revert message", async () => {
            const { validator, killLib } = await setupTests();
            const killLibAddress = await killLib.getAddress();
            await expect(validator.simulate.staticCall(killLibAddress, killLib.interface.encodeFunctionData("trever"))).to.revertedWith(
                "Why are you doing this?",
            );
        });

        it("should simulate transaction", async () => {
            const { validator, killLib } = await setupTests();
            const killLibAddress = await killLib.getAddress();
            const validatorAddress = await validator.getAddress();
            const estimate = await validator.simulate.staticCall(
                killLibAddress,
                killLib.interface.encodeFunctionData("estimate", [validatorAddress, "0x"]),
            );
            expect(estimate).to.be.lte(5000n);
        });

        it("should return modified state", async () => {
            const { validator, killLib } = await setupTests();
            const killLibAddress = await killLib.getAddress();
            const value = await validator.simulate.staticCall(killLibAddress, killLib.interface.encodeFunctionData("updateAndGet", []));
            expect(value).to.be.eq(1n);
            expect(await killLib.value()).to.be.eq(0n);
        });
    });
});