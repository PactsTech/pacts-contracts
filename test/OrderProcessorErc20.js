import hre from 'hardhat';
import { loadFixture, mine } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js';
import { expect } from 'chai';

const storeName = `Bob's Widgets`;
const cancelBlocks = 500n;
const disputeBlocks = 500n;
const buyerPublicKey = '0x557c9f3fcc1296ed254d7fb2e9f086fb1fa3f90fd1e0f305d213f8a27d22e50e';

describe('OrderProcessorErc20', () => {
  const deployOrderProcessorFixture = async () => {
    const publicClient = await hre.viem.getPublicClient();
    const [seller, reporter, arbiter, buyer] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract('TestToken', [1000000000, buyer.account.address]);
    const processor = await hre.viem.deployContract('OrderProcessorErc20', [
      storeName,
      cancelBlocks,
      disputeBlocks,
      reporter.account.address,
      buyerPublicKey,
      arbiter.account.address,
      buyerPublicKey,
      token.address
    ]);
    return { publicClient, token, processor, reporter, arbiter, seller, buyer };
  };

  describe('Orders', () => {
    it('Should allow you to get the store name', async () => {
      const { publicClient, processor } = await loadFixture(deployOrderProcessorFixture);
      const publicProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        publicClient
      });
      const storeName = await publicProcessor.read.storeName([]);
      expect(storeName).to.eq(`Bob's Widgets`, 'Store name should be set');
    });

    it('Should allow you to get the token address', async () => {
      const { publicClient, token, processor } = await loadFixture(deployOrderProcessorFixture);
      const publicProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        publicClient
      });
      const tokenAddress = await publicProcessor.read.token([]);
      const lowerAddress = token.address.toLowerCase();
      expect(tokenAddress.toLowerCase()).to.eq(lowerAddress, 'Token should be accessible');
    });

    it('Should allow you to get the seller address', async () => {
      const { publicClient, processor, seller } = await loadFixture(deployOrderProcessorFixture);
      const publicProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        publicClient
      });
      const sellerAddress = await publicProcessor.read.getSeller([]);
      const lowerAddress = seller.account.address.toLowerCase();
      expect(sellerAddress.toLowerCase()).to.eq(lowerAddress, 'Seller address should be set');
    });

    it('Should allow you to get the reporter address', async () => {
      const { publicClient, processor, reporter } = await loadFixture(deployOrderProcessorFixture);
      const publicProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        publicClient
      });
      const reporterAddress = await publicProcessor.read.getReporter([]);
      const lowerAddress = reporter.account.address.toLowerCase();
      expect(reporterAddress.toLowerCase()).to.eq(lowerAddress, 'Reporter address should be set');
    });

    it('Should allow you to get the arbiter address', async () => {
      const { publicClient, processor, arbiter } = await loadFixture(deployOrderProcessorFixture);
      const publicProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        publicClient
      });
      const arbiterAddress = await publicProcessor.read.getArbiter([]);
      const lowerAddress = arbiter.account.address.toLowerCase();
      expect(arbiterAddress.toLowerCase()).to.eq(lowerAddress, 'Arbiter address should be set');
    });

    it('Should allow you to submit an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, reporter, arbiter, buyer } = await loadFixture(deployOrderProcessorFixture);
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approval });
      if (approvalReceipt.status !== 'success') {
        expect.fail('approval transaction failed');
      }
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const reporterAddress = reporter.account.address;
      const arbiterAddress = arbiter.account.address;
      const metadataJson = JSON.stringify([{ name: 'Random Item' }]);
      const metadata = `0x${Buffer.from(metadataJson, 'utf8').toString('hex')}`;
      const submit = await buyerProcessor.write.submit([
        id,
        buyerPublicKey,
        reporterAddress,
        arbiterAddress,
        price,
        shipping,
        metadata
      ]);
      const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submit });
      if (submitReceipt.status !== 'success') {
        expect.fail('submit transaction failed');
      }
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderReporter,
        orderReporterPublicKey,
        orderArbiter,
        orderArbiterPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter,
        orderShipmentArbiter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(0, 'State should be 0');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderReporter.toLowerCase()).to.eq(reporter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderReporterPublicKey).to.eq(buyerPublicKey, 'Reporter Public Key should be set');
      expect(orderArbiter.toLowerCase()).to.eq(arbiter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderArbiterPublicKey).to.eq(buyerPublicKey, 'Arbiter Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(4n, 'Last modified block should be 4');
      expect(orderMetadata).to.eq(metadata, 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x', 'Shipment Buyer should be 0x');
      expect(orderShipmentReporter).to.eq('0x', 'Shipment Reporter should be 0x');
      expect(orderShipmentArbiter).to.eq('0x', 'Shipment Arbiter should be 0x');
    });

    it('Should allow you to ship an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, reporter, arbiter, buyer, seller } = await loadFixture(
        deployOrderProcessorFixture
      );
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approval });
      if (approvalReceipt.status !== 'success') {
        expect.fail('approval transaction failed');
      }
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const reporterAddress = reporter.account.address;
      const arbiterAddress = arbiter.account.address;
      const submit = await buyerProcessor.write.submit([
        id,
        buyerPublicKey,
        reporterAddress,
        arbiterAddress,
        price,
        shipping,
        '0x01'
      ]);
      const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submit });
      if (submitReceipt.status !== 'success') {
        expect.fail('submit transaction failed');
      }
      const sellerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: seller
      });
      const shipmentHex = '0x68656c6c6f20776f726c6421';
      const ship = await sellerProcessor.write.ship([id, shipmentHex, shipmentHex, shipmentHex]);
      const shipReceipt = await publicClient.waitForTransactionReceipt({ hash: ship });
      if (shipReceipt.status !== 'success') {
        expect.fail('ship transaction failed');
      }
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderReporter,
        orderReporterPublicKey,
        orderArbiter,
        orderArbiterPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter,
        orderShipmentArbiter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(1, 'State should be 1');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderReporter.toLowerCase()).to.eq(reporter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderReporterPublicKey).to.eq(buyerPublicKey, 'Reporter Public Key should be set');
      expect(orderArbiter.toLowerCase()).to.eq(arbiter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderArbiterPublicKey).to.eq(buyerPublicKey, 'Arbiter Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(5n, 'Last modified block should be 5');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq(shipmentHex, 'Shipment Buyer should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentReporter).to.eq(shipmentHex, 'Shipment Reporter should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentArbiter).to.eq(shipmentHex, 'Shipment Arbiter should be 0x68656c6c6f20776f726c6421');
    });

    it('Should allow you to deliver an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, reporter, arbiter, buyer, seller } = await loadFixture(
        deployOrderProcessorFixture
      );
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approval });
      if (approvalReceipt.status !== 'success') {
        expect.fail('approval transaction failed');
      }
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const reporterAddress = reporter.account.address;
      const arbiterAddress = arbiter.account.address;
      const submit = await buyerProcessor.write.submit([
        id,
        buyerPublicKey,
        reporterAddress,
        arbiterAddress,
        price,
        shipping,
        '0x01'
      ]);
      const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submit });
      if (submitReceipt.status !== 'success') {
        expect.fail('submit transaction failed');
      }
      const sellerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: seller
      });
      const shipmentHex = '0x68656c6c6f20776f726c6421';
      const ship = await sellerProcessor.write.ship([id, shipmentHex, shipmentHex, shipmentHex]);
      const shipReceipt = await publicClient.waitForTransactionReceipt({ hash: ship });
      if (shipReceipt.status !== 'success') {
        expect.fail('ship transaction failed');
      }
      const reporterProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: reporter
      });
      const deliver = await reporterProcessor.write.deliver([id]);
      const deliverReceipt = await publicClient.waitForTransactionReceipt({ hash: deliver });
      if (deliverReceipt.status !== 'success') {
        expect.fail('deliver transaction failed');
      }
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderReporter,
        orderReporterPublicKey,
        orderArbiter,
        orderArbiterPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter,
        orderShipmentArbiter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(2, 'State should be 2');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderReporter.toLowerCase()).to.eq(reporter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderReporterPublicKey).to.eq(buyerPublicKey, 'Reporter Public Key should be set');
      expect(orderArbiter.toLowerCase()).to.eq(arbiter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderArbiterPublicKey).to.eq(buyerPublicKey, 'Arbiter Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(6n, 'Last modified block should be 6');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq(shipmentHex, 'Shipment Buyer should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentReporter).to.eq(shipmentHex, 'Shipment Reporter should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentArbiter).to.eq(shipmentHex, 'Shipment Arbiter should be 0x68656c6c6f20776f726c6421');
    });

    it('Should allow you to complete an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, reporter, arbiter, buyer, seller } = await loadFixture(
        deployOrderProcessorFixture
      );
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approval });
      if (approvalReceipt.status !== 'success') {
        expect.fail('approval transaction failed');
      }
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const reporterAddress = reporter.account.address;
      const arbiterAddress = arbiter.account.address;
      const submit = await buyerProcessor.write.submit([
        id,
        buyerPublicKey,
        reporterAddress,
        arbiterAddress,
        price,
        shipping,
        '0x01'
      ]);
      const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submit });
      if (submitReceipt.status !== 'success') {
        expect.fail('submit transaction failed');
      }
      const sellerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: seller
      });
      const shipmentHex = '0x68656c6c6f20776f726c6421';
      const ship = await sellerProcessor.write.ship([id, shipmentHex, shipmentHex, shipmentHex]);
      const shipReceipt = await publicClient.waitForTransactionReceipt({ hash: ship });
      if (shipReceipt.status !== 'success') {
        expect.fail('ship transaction failed');
      }
      const reporterProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: reporter
      });
      const deliver = await reporterProcessor.write.deliver([id]);
      const deliverReceipt = await publicClient.waitForTransactionReceipt({ hash: deliver });
      if (deliverReceipt.status !== 'success') {
        expect.fail('deliver transaction failed');
      }
      await mine(500);
      const complete = await sellerProcessor.write.complete([id]);
      const completeReceipt = await publicClient.waitForTransactionReceipt({ hash: complete });
      if (completeReceipt.status !== 'success') {
        expect.fail('complete transaction failed');
      }
      const sellerBalance = await buyerToken.read.balanceOf([seller.account.address]);
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderReporter,
        orderReporterPublicKey,
        orderArbiter,
        orderArbiterPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter,
        orderShipmentArbiter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(3, 'State should be 3');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderReporter.toLowerCase()).to.eq(reporter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderReporterPublicKey).to.eq(buyerPublicKey, 'Reporter Public Key should be set');
      expect(orderArbiter.toLowerCase()).to.eq(arbiter.account.address.toLowerCase(), 'Reporter should be set');
      expect(orderArbiterPublicKey).to.eq(buyerPublicKey, 'Arbiter Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(507n, 'Last modified block should be 507');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq(shipmentHex, 'Shipment Buyer should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentReporter).to.eq(shipmentHex, 'Shipment Reporter should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentArbiter).to.eq(shipmentHex, 'Shipment Arbiter should be 0x68656c6c6f20776f726c6421');
      expect(sellerBalance).to.eq(11_000_000n, 'Seller balance should be 11_000_000');
    });
  });
});