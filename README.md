# EURO3-OAPP

The **BridgeManagerLZ** smart contract is designed to facilitate the seamless bridging of the EURO3 stable coin across different blockchain networks using Layer Zero infrastructure.

## Deployments

### Mainnet:

- Polygon:

  - Chain ID: 137
  - Endpoint ID: 40109
  - EURO3: [0xA0e4c84693266a9d3BBef2f394B33712c76599Ab](https://polygonscan.com/address/0xA0e4c84693266a9d3BBef2f394B33712c76599Ab)
  - MintableOwner: [0xB3857F86A95516902C953D530D3E5C29B1518a85](https://polygonscan.com/address/0xB3857F86A95516902C953D530D3E5C29B1518a85)
  - BridgeManagerLZ:

- Linea:

  - Chain ID: 59144
  - Endpoint ID: 40109
  - EURO3:
  - BridgeManagerLZ:

### Testnet:

- Mumbai:

  - Chain ID: 80001
  - Endpoint ID: 40109
  - EURO3: [0xa4876B4e2D43e9523AEc0224Edf6EB2D5D8CAe41](https://mumbai.polygonscan.com/address/0xa4876B4e2D43e9523AEc0224Edf6EB2D5D8CAe41)
  - MintableOwner: [0xa4876B4e2D43e9523AEc0224Edf6EB2D5D8CAe41](https://mumbai.polygonscan.com/address/0xa4876B4e2D43e9523AEc0224Edf6EB2D5D8CAe41)
  - BridgeManagerLZ: [0xd34877A7fF9a117585e5A49BB15c3c4b225D2a51](https://mumbai.polygonscan.com/address/0xd34877A7fF9a117585e5A49BB15c3c4b225D2a51)
    - Tx Mumbai to Arbitrum: [0x514ab4eaf2525dc06763ac2e5c63f5906e80ce8800800662ff7513a67fe3c549](https://layerzeroscan.com/tx/0x514ab4eaf2525dc06763ac2e5c63f5906e80ce8800800662ff7513a67fe3c549)

- Arbitrum:

  - Chain ID: 421614
  - Endpoint ID: 40231
  - EURO3: [0x881D1b255c638169F4216c8D63be0e9Da21C745E](https://sepolia.arbiscan.io/address/0x881D1b255c638169F4216c8D63be0e9Da21C745E)
  - MintableOwner: [0x62e6762EB9BB089Aaa7BFeF383384afAF64c9d28](https://sepolia.arbiscan.io/address/0x62e6762EB9BB089Aaa7BFeF383384afAF64c9d28)
  - BridgeManagerLZ: [0x2dA1BDFeD04206e5a8418EC9CFd0a19d806Fa7cA](https://sepolia.arbiscan.io/address/0x2dA1BDFeD04206e5a8418EC9CFd0a19d806Fa7cA)
    - Tx Arbitrum to Mumbai: [0xea5595f1a3b66378e619284b38c92f2d6504e0ed30a37524aa51eb0a7fb7152f](https://layerzeroscan.com/tx/0xea5595f1a3b66378e619284b38c92f2d6504e0ed30a37524aa51eb0a7fb7152f)

- Linea:

  - Chain ID: 59140
  - Endpoint ID: 40157
  - EURO3: [0xBA7999C79b63e155CfE5d51a44302F9384783b0B](https://goerli.lineascan.build/address/0xBA7999C79b63e155CfE5d51a44302F9384783b0B)
  - MintableOwner: [0x78e74CB5eBEf70f885C5f14CbCfCe905bd6a6b1E](https://goerli.lineascan.build/address/0x78e74CB5eBEf70f885C5f14CbCfCe905bd6a6b1E)
  - BridgeManagerLZ: [0xAE7967127944B3eF3703a7D1E0BdE9473C609C07](https://goerli.lineascan.build/address/0xAE7967127944B3eF3703a7D1E0BdE9473C609C07)

## Introduction

The **BridgeManagerLZ** smart contract is built on Layer Zero architecture, providing a robust solution for bridging EURO3 stable coins between different blockchain networks. This contract leverages the LayerZero messaging system to facilitate secure and efficient cross-chain transactions.

## Features

- **Bridging EURO3:** Users can bridge EURO3 tokens from one blockchain to another by interacting with the `bridge` function, enabling cross-chain transactions.

- **Receiving Bridged Tokens:** The contract supports the reception of bridged EURO3 tokens on the destination chain through the `_lzReceive` function.

- **Dynamic Chain Configuration:** The owner of the contract can configure destination chains by updating the destination bridgeManager and specifying whether the chain is allowed.

## Getting Started

### Prerequisites

- Node.js and npm installed
- [Hardhat](https://hardhat.org/) development environment

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/EURO3-OAPP.git
   ```

2. Install dependencies:

   ```bash
   cd EURO3-OAPP
   npm install
   ```

3. Compile the smart contract:

   ```bash
   npx hardhat compile
   ```

## Usage

### Bridging EURO3

Users can bridge EURO3 tokens from one chain to another by calling the `bridge` function, providing the required parameters such as amount, destination chain ID, options, and signature.

```solidity
// Example Bridge Function Call
bridge(amount, chainIdTo, options, signature);
```

### Receiving Bridged Tokens

The contract handles the reception of bridged tokens on the destination chain through the `_lzReceive` internal function. Users do not directly interact with this function.

### Configuring Destination Chains

The owner of the contract can update destination chains by calling the `updateDestChain` & `setPeer` functions, providing the new bridgeManager, destination chain ID, endpoint ID, peer and whether the chain is allowed.

```solidity
// Example Update Destination Chain
updateDestChain(bridgeManager, chainIdTo, endpointId, allowed);
```

```solidity
// Example Update Destination Chain
setPeer(endpointId, peer);

```

### How to interact

- Entry point for interaction is `scripts/index.ts`, you can run the following command: `npx hardhat run scripts/index.ts --network <DESIRED NETWORK>`
- Testing: You can test by running the following command: `npx hardhat test --network hardhat`

## Contributing

Contributions to the **BridgeManagerLZ** project are welcome! Please follow the [contribution guidelines](CONTRIBUTING.md) for more details.

## License

This project is licensed under the [BUSL-1.1 License](LICENSE).

---
