// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.20;

import {IMintableTokenOwner} from "../../interfaces/IMintableTokenOwner.sol";
import {IMintableToken} from "../../interfaces/IMintableToken.sol";
import {OApp, Origin, MessagingFee, MessagingReceipt} from "../../layerZero/oapp/contracts/oapp/OApp.sol";

contract BridgeManagerLZ is OApp {
    // using OptionsBuilder for bytes;

    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);

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

    uint64 public immutable CHAIN_ID; // chainId where the contract is deployed
    string public constant VERSION = "1.0.0";

    IMintableToken public immutable MintableToken; // EURO3
    IMintableTokenOwner public MintableOwner; // Proxy to mint more EURO3

    mapping(uint64 => destChain) public destinationChain;
    mapping(address => mapping(uint64 => uint256)) public txNonce;

    struct destChain {
        bytes bridgeManager;
        uint32 endpointId;
        bool allowed;
    }

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

    // User approves to BridgeManager, signs Tx Off chain and then calls this method
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

    // * Logic to Receive
    function _lzReceive(
        Origin calldata _origin, // struct containing srcEid, sender address, and the message nonce
        bytes32 _guid, // global message packet identifier
        bytes calldata payload, // encoded message being received
        address _executor, // the address of who executed the message
        bytes calldata _extraData // appended executor data for the call
    ) internal override {
        uint256 amount; // Amount tokens
        uint64 chainIdFrom; // ChainId from
        uint64 chainIdTo; // ChainId from
        uint256 nonce; // Tx nonce
        address receiver; // Person to receive tokens
        bytes memory bridgeManager; // destination bridgeManager
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

        MintableOwner.mint(receiver, amount);

        emit MessageReceived(msg.sender, amount, chainIdFrom, chainIdTo);
    }

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

    function updateMintableTokenOwner(
        address _mintableOwner
    ) external onlyOwner {
        require(_mintableOwner != address(0), "invalid-mintable-owner-address");
        MintableOwner = IMintableTokenOwner(_mintableOwner);
        emit MintableOwnerUpdated(_mintableOwner);
    }

    // Signature management
    function getMessageHash(
        uint256 _amount,
        uint64 _chainIdFrom,
        uint64 _chainIdTo,
        uint256 _nonce,
        bytes memory _bridgeManagerDest // Destination bridgeManager
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

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

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

    receive() external payable {}
}
