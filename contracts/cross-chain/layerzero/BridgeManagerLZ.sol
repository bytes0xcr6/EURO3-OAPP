// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IMintableTokenOwner} from "../../interfaces/IMintableTokenOwner.sol";
import {IMintableToken} from "../../interfaces/IMintableToken.sol";
import "../../utils/LayerZero/LzApp.sol";

//* Chain Endpoints: https://docs.layerzero.network/contracts/endpoint-addresses

// * CCIP Migrated to Layer Zero
// Todo: Add estimation gas

contract BridgeManagerLZ is Ownable, LzApp {
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);

    event MintableOwnerUpdated(address newMintableOwner);
    event ChainRouterUpdated(uint64 chainId, address bridgeManagerTo);
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
        address bridgeManagerTo; // todo! Maybe not needed
        uint16 endpointId;
        bool allowed;
    }

    constructor(
        uint64 _chainId,
        address _owner,
        address _mintableToken,
        address _mintableOwner,
        address _endpoint // * It should be the router/entrypoint from Layer Zero
    ) LzApp(_endpoint) {
        require(_owner != address(0), "invalid-owner-address");
        require(_mintableToken != address(0), "invalid-mintable-token-address");
        require(_mintableOwner != address(0), "invalid-mintable-owner-address");

        CHAIN_ID = _chainId;
        _transferOwnership(_owner);
        MintableOwner = IMintableTokenOwner(_mintableOwner);
        MintableToken = IMintableToken(_mintableToken);
    }

    // User approves to BridgeManager, signs Tx Off chain and then calls this method
    function burn(
        uint256 _amount,
        uint64 _chainIdTo,
        bytes memory _signature
    ) external payable {
        require(_chainIdTo != CHAIN_ID, "cannot-burn-on-same-chain");
        destChain memory destination = destinationChain[_chainIdTo];
        require(destination.allowed, "invalid-chain");
        MintableToken.transferFrom(msg.sender, address(this), _amount);
        MintableToken.burn(_amount);

        uint256 nonce = txNonce[msg.sender][_chainIdTo];
        require(
            verifySignature(
                _amount,
                CHAIN_ID,
                _chainIdTo,
                nonce,
                _signature,
                msg.sender
            )
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
            _signature
        );

        //* send LayerZero message
        _lzSend(
            destination.endpointId, // destination chainId
            payload, // abi.encode()'ed bytes
            payable(msg.sender), // (msg.sender will be this contract) refund address (LayerZero will refund any extra gas back to caller of send())
            address(0),
            bytes(""), // v1 adapterParams, specify custom destination gas qty
            msg.value
        );

        emit MessageSent(msg.sender, _amount, CHAIN_ID, _chainIdTo);
    }

    // * Logic to Receive
    // Todo: It may should only be called by the endpoint LZ
    // Todo: Maybe we don´t need to pass the chain ID
    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        uint256 amount; // Amount tokens
        uint64 chainIdFrom; // ChainId from
        uint64 chainIdTo; // ChainId from
        uint256 nonce; // Tx nonce
        address receiver; // Person to receive tokens
        bytes memory signature; // Signature

        (amount, chainIdFrom, chainIdTo, nonce, receiver, signature) = abi
            .decode(
                _payload,
                (uint256, uint64, uint64, uint256, address, bytes)
            );

        // Verify signature
        require(txNonce[msg.sender][chainIdFrom] == nonce, "invalid-nonce");
        txNonce[msg.sender][chainIdFrom]++;
        require(
            verifySignature(
                amount,
                chainIdFrom,
                chainIdTo,
                nonce,
                signature,
                receiver
            ),
            "invalid-signature"
        );
        // Mint EURO3
        MintableOwner.mint(receiver, amount);

        emit MessageReceived(msg.sender, amount, chainIdFrom, chainIdTo);
    }

    function updateDestChain(
        uint64 _chainIdTo,
        address _bridgeManager,
        uint16 _endpointId,
        bool _allowed
    ) external onlyOwner {
        require(_chainIdTo != CHAIN_ID, "cannot-update-same-chain");
        require(_bridgeManager != address(0), "invalid-bridgeManager-address");
        //  todo: Add a check to not allow 0 value for endpointId
        destinationChain[_chainIdTo] = destChain({
            bridgeManagerTo: _bridgeManager,
            endpointId: _endpointId,
            allowed: _allowed
        });

        emit ChainRouterUpdated(_chainIdTo, _bridgeManager);
    }

    function updateMintableTokenOwner(
        address _mintableOwner
    ) external onlyOwner {
        require(_mintableOwner != address(0), "invalid-mintable-owner-address");
        MintableOwner = IMintableTokenOwner(_mintableOwner);
        emit MintableOwnerUpdated(_mintableOwner);
    }

    // Signature verification loggic
    function getMessageHash(
        uint256 _amount,
        uint64 _chainIdFrom,
        uint64 _chainIdTo,
        uint256 _nonce
    ) public pure returns (bytes32) {
        bytes32 messageHash = keccak256(
            abi.encode(_amount, _chainIdFrom, _chainIdTo, _nonce)
        );
        return messageHash;
    }

    function verifySignature(
        uint256 _amount,
        uint64 _chainIdFrom,
        uint64 _chainIdTo,
        uint256 _nonce,
        bytes memory _signature,
        address _sender
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(
            _amount,
            _chainIdFrom,
            _chainIdTo,
            _nonce
        );
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(ethSignedMessageHash, _signature);
        return signer == _sender;
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

// contract BridgeManager_ is LzApp {
//     constructor(address _endpoint) LzApp(_endpoint) {}

//     uint256 number;

//     /**
//      * @dev Store value in variable & sends num crosschain
//      * @param num value to store
//      */
//     function store(uint256 num, uint64 dstChainId) public payable {
//         bytes memory payload = abi.encodePacked(num);
//         _lzSend(dstChainId, payload, payable(msg.sender), address(0), bytes(""), msg.value);
//         number = num;
//     }

//     /**
//      * @dev Crosschain receiver
//      */
//     function _blockingLzReceive(
//         uint64 _srcChainId,
//         bytes memory _srcAddress,
//         uint64 _nonce,
//         bytes memory _payload
//     ) internal override {
//         uint256 num = abi.decode(_payload, (uint256));
//         number = num;
//     }

//     /**
//      * @dev Return value
//      * @return value of 'number'
//      */
//     function retrieve() public view returns (uint256) {
//         return number;
//     }
// }
