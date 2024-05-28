# Pacts Contracts

Contract repository for [Pacts](https://pacts.tech). It is a [hardhat](https://hardhat.org/) project. Currently is only one main contract [OrderProcessorErc20](./contracts/OrderProcessorErc20.sol), which is the main order processor.

### Installation

```sh
npm i @pactstech/contracts
```

### Development

Installing dependencies:

```sh
npm ci
```

Compiling the contracts:

```sh
npm run compile
```

Running tests:

```sh
npm run test
```

### Deploying

It is recommended to use [pacts-viem](https://github.com/PactsTech/pacts-viem) to deploy. However you may use this script to test locally:

```sh
HARDHAT_NETWORK=localhost STORE_NAME=test-store node scripts/deploy.js
```

For all contract parameters, check the [deploy script](./scripts/deploy.js).

Consult the [hardhat script arguments](https://hardhat.org/hardhat-runner/docs/advanced/scripts#hardhat-arguments) docs for other supported arguments.

### Generating ABI JSON

* requires `jq`

```sh
npm run abi
```
