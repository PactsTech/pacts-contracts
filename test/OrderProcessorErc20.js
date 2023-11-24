import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';

describe('OrderProcessor', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployOrderProcessorFixture = async () => {
    const [seller, arbiter, buyer, shipper] = await ethers.getSigners();
    const TestToken = await ethers.getContractFactory('TestToken');
    const token = await TestToken.deploy(1000000000, buyer);
    const OrderProcessor = await ethers.getContractFactory('OrderProcessorErc20');
    const processor = await OrderProcessor.deploy(token.target, arbiter);
    return { token, processor, arbiter, seller, buyer, shipper };
  };

  describe('Orders', () => {
    it('Should allow you to create an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata);
      const [
        orderSequence,
        orderBuyer,
        orderShipper,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderShipment,
        orderMetadata
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderShipper).to.eq(shipper.address, 'Shipper should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.eq(0n, 'Confirmed block should be 0');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(0n, 'State should be 0');
      expect(orderShipment).to.eq('0x', 'Shipment should be 0x');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the seller to confirm an order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata);
      await processor.connect(seller).confirm(id);
      const [
        orderSequence,
        orderBuyer,
        orderShipper,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderShipment,
        orderMetadata
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderShipper).to.eq(shipper.address, 'Shipper should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.gte(5n, 'Confirmed block should be 0');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(1n, 'State should be 1');
      expect(orderShipment).to.eq('0x', 'Shipment should be 0x');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the seller to handoff the order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata);
      await processor.connect(seller).confirm(id);
      const shipment = Buffer.from([0x02]);
      await processor.connect(seller).handOff(id, shipment);
      const [
        orderSequence,
        orderBuyer,
        orderShipper,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderShipment,
        orderMetadata
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderShipper).to.eq(shipper.address, 'Shipper should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.gte(5n, 'Confirmed block should be 5');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(2n, 'State should be 2');
      expect(orderShipment).to.eq('0x02', 'Shipment should be 0x02');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the shipper to ship the order', async () => {
      const price = 10000000;
      const shipping = 1000000;
      const { token, processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      await token.connect(buyer).approve(processor.target, price + shipping);
      const id = 'testId';
      const metadata = Buffer.from([0x01]);
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata);
      await processor.connect(seller).confirm(id);
      const shipment = Buffer.from([0x02]);
      await processor.connect(seller).handOff(id, shipment);
      await processor.connect(shipper).ship(id);
      const [
        orderSequence,
        orderBuyer,
        orderShipper,
        orderPrice,
        orderShipping,
        orderSubmittedBlock,
        orderConfirmedBlock,
        orderShippedBlock,
        orderDeliveredBlock,
        orderState,
        orderShipment,
        orderMetadata
      ] = await processor.getOrder(id);
      expect(orderSequence).to.eq(1n, 'Sequence should be 1');
      expect(orderBuyer).to.eq(buyer.address, 'Buyer should be set');
      expect(orderShipper).to.eq(shipper.address, 'Shipper should be set');
      expect(orderPrice).to.eq(10000000n, 'Price should be 10000000');
      expect(orderShipping).to.eq(1000000n, 'Shipping should be 1000000');
      expect(orderSubmittedBlock).to.gte(4n, 'Submitted block should be 4');
      expect(orderConfirmedBlock).to.gte(5n, 'Confirmed block should be 5');
      expect(orderShippedBlock).to.gte(7n, 'Shipped block should be 7');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(3n, 'State should be 3');
      expect(orderShipment).to.eq('0x02', 'Shipment should be 0x02');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });
  });
});