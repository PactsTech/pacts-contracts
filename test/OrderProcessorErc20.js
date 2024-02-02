import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js';
import { expect } from 'chai';

const storeName = `Bob's Widgets`;
const buyerPublicKey = '0x557c9f3fcc1296ed254d7fb2e9f086fb1fa3f90fd1e0f305d213f8a27d22e50e';

describe('OrderProcessorErc20', () => {
  const deployOrderProcessorFixture = async () => {
    const publicClient = await hre.viem.getPublicClient();
    const [seller, reporter, arbiter, buyer] = await hre.viem.getWalletClients();
    const token = await hre.viem.deployContract('TestToken', [1000000000, buyer.account.address]);
    const processor = await hre.viem.deployContract('OrderProcessorErc20', [
      storeName,
      reporter.account.address,
      buyerPublicKey,
      reporter.account.address,
      buyerPublicKey,
      token.address
    ]);
    return { publicClient, token, processor, reporter, arbiter, seller, buyer };
  };

  describe('Orders', () => {
    it('Should allow you to create an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, buyer } = await loadFixture(deployOrderProcessorFixture);
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      await publicClient.waitForTransactionReceipt({ hash: approval });
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const submit = await buyerProcessor.write.submit([id, buyerPublicKey, price, shipping, '0x01']);
      await publicClient.waitForTransactionReceipt({ hash: submit });
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(0, 'State should be 0');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(4n, 'Last modified block should be 4');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x', 'Shipment Buyer should be 0x');
      expect(orderShipmentReporter).to.eq('0x', 'Shipment Reporter should be 0x');
    });

    it('Should allow you to ship an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { publicClient, token, processor, buyer, seller } = await loadFixture(deployOrderProcessorFixture);
      const buyerToken = await hre.viem.getContractAt('TestToken', token.address, { walletClient: buyer });
      const approval = await buyerToken.write.approve([processor.address, price + shipping]);
      await publicClient.waitForTransactionReceipt({ hash: approval });
      const id = 'testId';
      const buyerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: buyer
      });
      const submit = await buyerProcessor.write.submit([id, buyerPublicKey, price, shipping, '0x01']);
      await publicClient.waitForTransactionReceipt({ hash: submit });
      const sellerProcessor = await hre.viem.getContractAt('OrderProcessorErc20', processor.address, {
        walletClient: seller
      });
      const shipmentHex = '0x68656c6c6f20776f726c6421';
      const ship = await sellerProcessor.write.ship([id, shipmentHex, shipmentHex]);
      await publicClient.waitForTransactionReceipt({ hash: ship });
      const [
        orderSequence,
        orderState,
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderLastModifiedBlock,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderState).to.eq(1, 'State should be 1');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderLastModifiedBlock).to.eq(5n, 'Last modified block should be 4');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq(shipmentHex, 'Shipment Buyer should be 0x68656c6c6f20776f726c6421');
      expect(orderShipmentReporter).to.eq(shipmentHex, 'Shipment Reporter should be 0x68656c6c6f20776f726c6421');
    });
  });
});