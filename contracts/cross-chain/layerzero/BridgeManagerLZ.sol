// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

// Importing interfaces and external contracts
import {IMintableTokenOwner} from "../../interfaces/IMintableTokenOwner.sol";
import {IMintableToken} from "../../interfaces/IMintableToken.sol";
import {OApp, Origin, MessagingFee, MessagingReceipt} from "../../layerZero/oapp/contracts/oapp/OApp.sol";

/**
 * @title BridgeManagerLZ
 * @dev Manages the bridging of tokens between different chains using LayerZero messaging
 * @author 3A DAO - Cristian Richarte 0xCR6
 */
contract BridgeManagerLZ is OApp {
    // Custom errors to be used in the contract
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);

    // Events for important contract state changes
    event MintableOwnerUpdated(address newMintableOwner);
    event ChainRouterUpdated(uint64 chainId, bool isAllowed);
    event MessageSent(
        address receiver,
        uint256 amount,
        uint64 chainIdFrom,
        uint64 chainIdTo
    );
    event MessageReceived(
        address sender,
        uint256 amount,
        uint64 chainIdFrom,
        uint64 chainIdTo
    );
    event RouterUpdated(address newRouter);

    // Immutable variables
    uint64 public immutable CHAIN_ID; // chainId where the contract is deployed
    string public constant VERSION = "1.0.0";

    // Contract interfaces
    IMintableToken public immutable MintableToken; // EURO3
    IMintableTokenOwner public MintableOwner; // Proxy to mint more EURO3

    // Destination chain information mapping
    mapping(uint64 => destChain) public destinationChain;
    // Transaction nonce mapping for each user and destination chain
    mapping(address => mapping(uint64 => uint256)) public txNonce;

    // Struct to hold destination chain information
    struct destChain {
        bytes bridgeManager;
        uint32 endpointId;
        bool allowed;
    }

    /**
     * @dev Contract constructor
     * @param _chainId Chain ID where the contract is deployed
     * @param _owner Owner's address
     * @param _mintableToken Address of the mintable token (EURO3)
     * @param _mintableOwner Address of the mintable token owner (Proxy)
     * @param _endpoint Address of the router/entrypoint from Layer Zero
     */
    constructor(
        uint64 _chainId,
        address _owner,
        address _mintableToken,
        address _mintableOwner,
        address _endpoint // * It should be the router/entrypoint from Layer Zero
    ) OApp(_endpoint, _owner) {
        require(_owner != address(0), "invalid-owner-address");
        require(_mintableToken != address(0), "invalid-mintable-token-address");
        require(_mintableOwner != address(0), "invalid-mintable-owner-address");

        CHAIN_ID = _chainId;
        _transferOwnership(_owner);
        MintableOwner = IMintableTokenOwner(_mintableOwner);
        MintableToken = IMintableToken(_mintableToken);
    }

    /**
     * @dev User approves to BridgeManager, signs Tx Off chain, and then calls this method
     * @param _amount Amount of tokens to be bridged
     * @param _chainIdTo Destination chain ID
     * @param _options Additional options for messaging
     * @param _signature User's signature for the transaction
     * @return receipt Result of the LayerZero messaging
     */
    function bridge(
        uint256 _amount,
        uint64 _chainIdTo,
        bytes memory _options,
        bytes memory _signature
    ) external payable returns (MessagingReceipt memory) {
        require(_chainIdTo != CHAIN_ID, "cannot-burn-on-same-chain");
        destChain memory destination = destinationChain[_chainIdTo];
        require(destination.allowed, "invalid-chain");
        MintableToken.transferFrom(msg.sender, address(this), _amount);
        MintableToken.burn(_amount);

        uint256 nonce = txNonce[msg.sender][_chainIdTo];

        verifySignature(
            _amount,
            CHAIN_ID,
            _chainIdTo,
            nonce,
            _signature,
            msg.sender,
            destination.bridgeManager
        );

        unchecked {
            txNonce[msg.sender][_chainIdTo]++;
        }

        bytes memory payload = abi.encode(
            _amount,
            CHAIN_ID,
            _chainIdTo,
            nonce,
            msg.sender,
            _signature,
            destination.bridgeManager
        );

        MessagingFee memory fee = _quote(
            destination.endpointId,
            payload,
            _options,
            false
        );

        //* send LayerZero message
        MessagingReceipt memory receipt = _lzSend(
            destination.endpointId, // destination endpoint ID
            payload, // Encoded message payload being sent.
            _options, // message execution options
            fee, // v1 adapterParams, specify custom destination gas qty
            payable(msg.sender) // (msg.sender will be this contract) refund address (LayerZero will refund any extra gas back to caller of send())
        );

        emit MessageSent(msg.sender, _amount, CHAIN_ID, _chainIdTo);

        return receipt;
    }

    /**
     * @dev Handles the logic to receive bridged tokens on the Layer Zero protocol
     * @param _origin Struct containing srcEid, sender address, and the message nonce
     * @param _guid Global message packet identifier
     * @param payload Encoded message being received
     * @param _executor The address of the entity executing the message
     * @param _extraData Appended executor data for the call
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        uint256 amount; // Amount tokens
        uint64 chainIdFrom; // ChainId from
        uint64 chainIdTo; // ChainId from
        uint256 nonce; // Tx nonce
        address receiver; // Person to receive tokens
        bytes memory bridgeManager; // Destination bridgeManager
        bytes memory signature; // Signature

        (
            amount,
            chainIdFrom,
            chainIdTo,
            nonce,
            receiver,
            signature,
            bridgeManager
        ) = abi.decode(
            payload,
            (uint256, uint64, uint64, uint256, address, bytes, bytes)
        );

        // Verify signature
        require(txNonce[msg.sender][chainIdFrom] == nonce, "invalid-nonce");
        txNonce[msg.sender][chainIdFrom]++;

        verifySignature(
            amount,
            chainIdFrom,
            chainIdTo,
            nonce,
            signature,
            receiver,
            bridgeManager
        );

        // Mint tokens to the receiver
        MintableOwner.mint(receiver, amount);

        // Emit the MessageReceived event
        emit MessageReceived(msg.sender, amount, chainIdFrom, chainIdTo);
    }

    /**
     * @dev Updates destination chain information
     * @param _bridgeManager Address of the destination bridgeManager
     * @param _chainIdTo Destination chain ID
     * @param _endpointId Destination endpoint ID
     * @param _allowed Whether the destination chain is allowed or not
     */
    function updateDestChain(
        bytes memory _bridgeManager,
        uint64 _chainIdTo,
        uint32 _endpointId,
        bool _allowed
    ) external onlyOwner {
        require(_chainIdTo != CHAIN_ID, "cannot-update-same-chain");
        require(_bridgeManager.length > 0, "cannot-be-empty");

        destinationChain[_chainIdTo] = destChain({
            endpointId: _endpointId,
            allowed: _allowed,
            bridgeManager: _bridgeManager
        });

        emit ChainRouterUpdated(_chainIdTo, _allowed);
    }

    /**
     * @dev Returns the native and LZToken fees for a given transaction
     * @param _amount Amount of tokens to be bridged
     * @param _chainIdTo Destination chain ID
     * @param _signature User's signature for the transaction
     * @param _options Additional options for messaging
     * @param sender The address of the transaction sender
     * @return nativeFee Native fee in the destination chain's native token
     * @return lzTokenFee Fee in LZToken for the transaction
     */
    function quote(
        uint256 _amount,
        uint64 _chainIdTo,
        bytes memory _signature,
        bytes memory _options,
        address sender
    ) public view returns (uint256 nativeFee, uint256 lzTokenFee) {
        destChain memory destination = destinationChain[_chainIdTo];
        require(destination.allowed, "invalid-chain-id-to");
        uint256 nonce = txNonce[sender][_chainIdTo];

        bytes memory payload = abi.encode(
            _amount,
            CHAIN_ID,
            _chainIdTo,
            nonce,
            sender,
            _signature,
            destination.bridgeManager
        );

        MessagingFee memory fee = _quote(
            destination.endpointId,
            payload,
            _options,
            false
        );
        return (fee.nativeFee, fee.lzTokenFee);
    }

    /**
     * @dev Updates the address of the MintableTokenOwner
     * @param _mintableOwner Address of the new MintableTokenOwner
     */
    function updateMintableTokenOwner(
        address _mintableOwner
    ) external onlyOwner {
        require(_mintableOwner != address(0), "invalid-mintable-owner-address");
        MintableOwner = IMintableTokenOwner(_mintableOwner);
        emit MintableOwnerUpdated(_mintableOwner);
    }

    /**
     * @dev Computes the message hash for signature verification
     * @param _amount Amount of tokens to be bridged
     * @param _chainIdFrom Source chain ID
     * @param _chainIdTo Destination chain ID
     * @param _nonce Transaction nonce
     * @param _bridgeManagerDest Address of the destination bridgeManager
     * @return messageHash Computed message hash
     */
    function getMessageHash(
        uint256 _amount,
        uint64 _chainIdFrom,
        uint64 _chainIdTo,
        uint256 _nonce,
        bytes memory _bridgeManagerDest
    ) public pure returns (bytes32) {
        bytes32 messageHash = keccak256(
            abi.encode(
                _amount,
                _chainIdFrom,
                _chainIdTo,
                _nonce,
                _bridgeManagerDest
            )
        );
        return messageHash;
    }

    /**
     * @dev Verifies the signature of a message
     * @param _amount Amount of tokens to be bridged
     * @param _chainIdFrom Source chain ID
     * @param _chainIdTo Destination chain ID
     * @param _nonce Transaction nonce
     * @param _signature User's signature for the transaction
     * @param _sender Address of the transaction sender
     * @param _bridgeManagerDest Address of the destination bridgeManager
     * @return True if the signature is valid, otherwise reverts
     */
    function verifySignature(
        uint256 _amount,
        uint64 _chainIdFrom,
        uint64 _chainIdTo,
        uint256 _nonce,
        bytes memory _signature,
        address _sender,
        bytes memory _bridgeManagerDest
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(
            _amount,
            _chainIdFrom,
            _chainIdTo,
            _nonce,
            _bridgeManagerDest
        );
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(ethSignedMessageHash, _signature);
        require(signer == _sender, "invalid-signature");
        return true;
    }

    /**
     * @dev Computes the Ethereum signed message hash
     * @param _messageHash Computed message hash
     * @return ethSignedMessageHash Computed Ethereum signed message hash
     */
    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) internal pure returns (bytes32 ethSignedMessageHash) {
        ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
        return ethSignedMessageHash;
    }

    /**
     * @dev Recovers the signer from a signature
     * @param _ethSignedMessageHash Computed Ethereum signed message hash
     * @param _signature Signature of the message
     * @return Address of the signer
     */
    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    /**
     * @dev Splits a signature into its components
     * @param _signature Signature to be split
     * @return r Component r of the signature
     * @return s Component s of the signature
     * @return v Component v of the signature
     */
    function splitSignature(
        bytes memory _signature
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_signature.length == 65, "invalid-signature-length");
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
    }

    /**
     * @dev Fallback function to accept Native
     */
    receive() external payable {}
}
