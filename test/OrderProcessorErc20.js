import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers.js';
import { expect } from 'chai';

const storeName = `Bob's Widgets`;
const reporterPublicKey = '03ccf19f6222dfa2c7f063b04c8cdc0586b12b26466ab2d09dd45e112f6c3abddf';
const buyerPublicKey = '0x0310855103b6fada7e3d24cfd812941ac60d54254ef0c0ceb100bb93c4dc1b9146';

describe('OrderProcessorErc20', () => {
  const deployOrderProcessorFixture = async () => {
    const publicClient = await hre.viem.getPublicClient();
    const [seller, reporter, arbiter, buyer] = await hre.viem.getWalletClients();
    const publicKey = Buffer.from(reporterPublicKey, 'hex');
    const token = await hre.viem.deployContract('TestToken', [1000000000, buyer.account.address]);
    const processor = await hre.viem.deployContract('OrderProcessorErc20', [
      storeName,
      reporter.account.address,
      publicKey,
      reporter.account.address,
      publicKey,
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
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.read.getOrder([id]);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer.toLowerCase()).to.eq(buyer.account.address.toLowerCase(), 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(buyerPublicKey, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.eq(4n, 'Submitted block should be 4');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(0, 'State should be 0');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x', 'Shipment Buyer should be 0x');
      expect(orderShipmentReporter).to.eq('0x', 'Shipment Reporter should be 0x');
    });
  });
});