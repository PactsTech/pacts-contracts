import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';

const name = `Bob's Widgets`;
const reporterPublicKey = '03ccf19f6222dfa2c7f063b04c8cdc0586b12b26466ab2d09dd45e112f6c3abddf';
const buyerPublicKey = '0310855103b6fada7e3d24cfd812941ac60d54254ef0c0ceb100bb93c4dc1b9146';

describe('OrderProcessorReporterErc20', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployOrderProcessorFixture = async () => {
    const [seller, reporter, arbiter, buyer] = await ethers.getSigners();
    const publicKey = Buffer.from(reporterPublicKey, 'hex');
    const TestToken = await ethers.getContractFactory('TestToken');
    const token = await TestToken.deploy(1000000000, buyer);
    const OrderProcessor = await ethers.getContractFactory('OrderProcessorReporterErc20');
    const processor = await OrderProcessor.deploy(name, reporter, publicKey, reporter, publicKey, token.target);
    return { token, processor, reporter, arbiter, seller, buyer };
  };

  describe('Orders', () => {
    it('Should allow you to create an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, buyer } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const publicKey = Buffer.from(buyerPublicKey, 'hex');
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, publicKey, price, shipping, metadata);
      const [
        orderSequence,
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(`0x${buyerPublicKey}`, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.eq(0n, 'Confirmed block should be 0');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(0n, 'State should be 0');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x', 'Shipment Buyer should be 0x');
      expect(orderShipmentReporter).to.eq('0x', 'Shipment Reporter should be 0x');
    });

    it('Should allow the seller to confirm an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, seller, buyer } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const publicKey = Buffer.from(buyerPublicKey, 'hex');
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, publicKey, price, shipping, metadata);
      await processor.connect(seller).confirm(id);
      const [
        orderSequence,
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(`0x${buyerPublicKey}`, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.gte(5n, 'Confirmed block should be 0');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(1n, 'State should be 1');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x', 'Shipment Buyer should be 0x');
      expect(orderShipmentReporter).to.eq('0x', 'Shipment Reporter should be 0x');
    });

    it('Should allow the seller to ship the order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, seller, buyer } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const publicKey = Buffer.from(buyerPublicKey, 'hex');
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, publicKey, price, shipping, metadata);
      await processor.connect(seller).confirm(id);
      const shipmentBuyer = Buffer.from([0x02]);
      const shipmentReporter = Buffer.from([0x03]);
      await processor.connect(seller).ship(id, shipmentBuyer, shipmentReporter);
      const [
        orderSequence,
        orderBuyer,
        orderBuyerPublicKey,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderMetadata,
        orderShipmentBuyer,
        orderShipmentReporter
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderBuyerPublicKey).to.eq(`0x${buyerPublicKey}`, 'Buyer Public Key should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.gte(5n, 'Confirmed block should be 5');
      expect(orderShippedBlock).to.gte(6n, 'Shipped block should be 7');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(2n, 'State should be 2');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
      expect(orderShipmentBuyer).to.eq('0x02', 'Shipment Buyer should be 0x02');
      expect(orderShipmentReporter).to.eq('0x03', 'Shipment Reporter should be 0x03');
    });
  });
});