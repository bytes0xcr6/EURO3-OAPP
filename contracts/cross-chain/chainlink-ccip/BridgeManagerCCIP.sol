// // SPDX-License-Identifier: BUSL-1.1
// pragma solidity 0.8.19;

// import "@openzeppelin/contracts/access/Ownable.sol";
// import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
// import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
// import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
// import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
// import {IMintableTokenOwner} from "../../interfaces/IMintableTokenOwner.sol";
// import {IMintableToken} from "../../interfaces/IMintableToken.sol";

// contract BridgeManagerCCIP is Ownable, CCIPReceiver {
//     error NothingToWithdraw();
//     error FailedToWithdrawEth(address owner, address target, uint256 value);

//     event MintableOwnerUpdated(address newMintableOwner);
//     event ChainRouterUpdated(uint64 chainId, address bridgeManagerTo);
//     event MessageSent(
//         address receiver,
//         uint256 amount,
//         uint64 chainIdFrom,
//         uint64 chainIdTo,
//         address feeToken,
//         uint256 fee,
//         bytes32 messageId
//     );
//     event MessageReceived(
//         address sender,
//         uint256 amount,
//         uint64 chainIdFrom,
//         uint64 chainIdTo,
//         bytes32 indexed messageId
//     );
//     event RouterUpdated(address newRouter);

//     uint64 public immutable CHAIN_ID; // chainId where the contract is deployed
//     string public constant VERSION = "1.0.0";

//     IMintableToken public immutable MintableToken; // EURO3
//     LinkTokenInterface immutable i_link; //LINK Token
//     IMintableTokenOwner public MintableOwner; // Proxy to mint more EURO3
//     IRouterClient public i_ccipRouter;

//     mapping(uint64 => destChain) public destinationChain;
//     mapping(address => mapping(uint64 => uint256)) public txNonce;

//     struct destChain {
//         address bridgeManagerTo;
//         uint64 chainSelector;
//         bool allowed;
//     }

//     constructor(
//         uint64 _chainId,
//         address _owner,
//         address _mintableToken,
//         address _mintableOwner,
//         address _i_link,
//         address _i_ccipRouter
//     ) CCIPReceiver(_i_ccipRouter) {
//         require(_owner != address(0), "invalid-owner-address");
//         require(_mintableToken != address(0), "invalid-mintable-token-address");
//         require(_mintableOwner != address(0), "invalid-mintable-owner-address");
//         require(_i_link != address(0), "invalid-link-address");
//         require(_i_ccipRouter != address(0), "invalid-ccip-router-address");

//         CHAIN_ID = _chainId;
//         _transferOwnership(_owner);
//         MintableOwner = IMintableTokenOwner(_mintableOwner);
//         MintableToken = IMintableToken(_mintableToken);
//         i_link = LinkTokenInterface(_i_link);
//         i_ccipRouter = IRouterClient(_i_ccipRouter);
//     }

//     // User approves to BridgeManager, signs Tx Off chain and then calls this method
//     function burn(
//         uint256 _amount,
//         uint64 _chainIdTo,
//         bytes memory _signature,
//         address _feeToken,
//         uint256 _gasLimit
//     ) external {
//         require(_chainIdTo != CHAIN_ID, "cannot-burn-on-same-chain");
//         destChain memory destination = destinationChain[_chainIdTo];
//         require(destination.allowed, "invalid-chain");
//         MintableToken.transferFrom(msg.sender, address(this), _amount);
//         MintableToken.burn(_amount);

//         uint256 nonce = txNonce[msg.sender][_chainIdTo];
//         require(
//             verifySignature(
//                 _amount,
//                 CHAIN_ID,
//                 _chainIdTo,
//                 nonce,
//                 _signature,
//                 msg.sender
//             )
//         );
//         unchecked {
//             txNonce[msg.sender][_chainIdTo]++;
//         }
//         // CCIP Flow to mint on other chain
//         address feeToken;
//         if (_feeToken == address(i_link)) {
//             feeToken = address(i_link); // CCIP Fee will be charged from LINK
//         } else {
//             feeToken = address(0); // CCIP Fee will be charged from native
//         }

//         Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
//             receiver: abi.encode(destination.bridgeManagerTo),
//             data: abi.encode(
//                 _amount,
//                 CHAIN_ID,
//                 _chainIdTo,
//                 nonce,
//                 msg.sender,
//                 _signature
//             ),
//             tokenAmounts: new Client.EVMTokenAmount[](0),
//             extraArgs: Client._argsToBytes(
//                 Client.EVMExtraArgsV1({gasLimit: _gasLimit})
//             ),
//             feeToken: feeToken
//         });

//         uint256 fees = i_ccipRouter.getFee(destination.chainSelector, message);
//         bytes32 messageId = i_ccipRouter.ccipSend(
//             destination.chainSelector,
//             message
//         );

//         emit MessageSent(
//             msg.sender,
//             _amount,
//             CHAIN_ID,
//             _chainIdTo,
//             _feeToken,
//             fees,
//             messageId
//         );
//     }

//     function updateDestChain(
//         uint64 _chainIdTo,
//         address _bridgeManager,
//         uint64 _chainSelector,
//         bool _allowed
//     ) external onlyOwner {
//         require(_chainIdTo != CHAIN_ID, "cannot-update-same-chain");
//         require(_bridgeManager != address(0), "invalid-bridgeManager-address");

//         destinationChain[_chainIdTo] = destChain({
//             bridgeManagerTo: _bridgeManager,
//             chainSelector: _chainSelector,
//             allowed: _allowed
//         });

//         emit ChainRouterUpdated(_chainIdTo, _bridgeManager);
//     }

//     function updateRouter(address _newRouter) external onlyOwner {
//         i_ccipRouter = IRouterClient(_newRouter);
//         emit RouterUpdated(_newRouter);
//     }

//     function updateMintableTokenOwner(
//         address _mintableOwner
//     ) external onlyOwner {
//         require(_mintableOwner != address(0), "invalid-mintable-owner-address");
//         MintableOwner = IMintableTokenOwner(_mintableOwner);
//         emit MintableOwnerUpdated(_mintableOwner);
//     }

//     // CCIP
//     function _ccipReceive(
//         Client.Any2EVMMessage memory any2EvmMessage
//     ) internal override {
//         require(msg.sender == address(i_ccipRouter), "invalid-router");
//         uint256 amount; // Amount tokens
//         uint64 chainIdFrom; // ChainId from
//         uint64 chainIdTo; // ChainId from
//         uint256 nonce; // Tx nonce
//         address receiver; // Person to receive tokens
//         bytes memory signature; // Signature
//         bytes32 messageId = any2EvmMessage.messageId;
//         (amount, chainIdFrom, chainIdTo, nonce, receiver, signature) = abi
//             .decode(
//                 any2EvmMessage.data,
//                 (uint256, uint64, uint64, uint256, address, bytes)
//             );

//         // Verify signature
//         require(txNonce[msg.sender][chainIdFrom] == nonce, "invalid-nonce");
//         txNonce[msg.sender][chainIdFrom]++;
//         require(
//             verifySignature(
//                 amount,
//                 chainIdFrom,
//                 chainIdTo,
//                 nonce,
//                 signature,
//                 receiver
//             ),
//             "invalid-signature"
//         );
//         // Mint EURO3
//         MintableOwner.mint(receiver, amount);

//         emit MessageReceived(
//             msg.sender,
//             amount,
//             chainIdFrom,
//             chainIdTo,
//             messageId
//         );
//     }

//     // Signature verification loggic
//     function getMessageHash(
//         uint256 _amount,
//         uint64 _chainIdFrom,
//         uint64 _chainIdTo,
//         uint256 _nonce
//     ) public pure returns (bytes32) {
//         bytes32 messageHash = keccak256(
//             abi.encode(_amount, _chainIdFrom, _chainIdTo, _nonce)
//         );
//         return messageHash;
//     }

//     function verifySignature(
//         uint256 _amount,
//         uint64 _chainIdFrom,
//         uint64 _chainIdTo,
//         uint256 _nonce,
//         bytes memory _signature,
//         address _sender
//     ) public pure returns (bool) {
//         bytes32 messageHash = getMessageHash(
//             _amount,
//             _chainIdFrom,
//             _chainIdTo,
//             _nonce
//         );
//         bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
//         address signer = recoverSigner(ethSignedMessageHash, _signature);
//         return signer == _sender;
//     }

//     function getEthSignedMessageHash(
//         bytes32 _messageHash
//     ) internal pure returns (bytes32) {
//         return
//             keccak256(
//                 abi.encodePacked(
//                     "\x19Ethereum Signed Message:\n32",
//                     _messageHash
//                 )
//             );
//     }

//     function recoverSigner(
//         bytes32 _ethSignedMessageHash,
//         bytes memory _signature
//     ) internal pure returns (address) {
//         (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
//         return ecrecover(_ethSignedMessageHash, v, r, s);
//     }

//     function splitSignature(
//         bytes memory _signature
//     ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
//         require(_signature.length == 65, "invalid-signature-length");
//         assembly {
//             r := mload(add(_signature, 32))
//             s := mload(add(_signature, 64))
//             v := byte(0, mload(add(_signature, 96)))
//         }
//     }

//     receive() external payable {}

//     function withdraw(address _receiver) public onlyOwner {
//         uint256 amount = address(this).balance;

//         if (amount == 0) revert NothingToWithdraw();

//         (bool sent, ) = _receiver.call{value: amount}("");

//         if (!sent) revert FailedToWithdrawEth(msg.sender, _receiver, amount);
//     }

//     function withdrawLink(address _receiver) public onlyOwner {
//         uint256 amount = i_link.balanceOf(address(this));

//         if (amount == 0) revert NothingToWithdraw();

//         i_link.transfer(_receiver, amount);
//     }
// }
