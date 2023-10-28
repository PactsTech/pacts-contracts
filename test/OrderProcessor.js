import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';

describe('OrderProcessor', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployOrderProcessorFixture = async () => {
    const [seller, arbiter, buyer, shipper] = await ethers.getSigners();
    const OrderProcessor = await ethers.getContractFactory('OrderProcessor');
    const processor = await OrderProcessor.deploy(arbiter);
    return { processor, arbiter, seller, buyer, shipper };
  };

  describe('Orders', () => {
    it('Should allow you to create an order', async () => {
      const { processor, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      const id = 'testId';
      const price = 2;
      const shipping = 1;
      const metadata = Buffer.from([0x01]);
      const value = 3;
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata, { value });
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
      expect(orderPrice).to.eq(2n, 'Price should be 2');
      expect(orderShipping).to.eq(1n, 'Shipping should be 1');
      expect(orderSubmittedBlock).to.eq(2n, 'Submitted block should be 2');
      expect(orderConfirmedBlock).to.eq(0n, 'Confirmed block should be 0');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(0n, 'State should be 0');
      expect(orderShipment).to.eq('0x', 'Shipment should be 0x');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the seller to confirm an order', async () => {
      const { processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      const id = 'testId';
      const price = 2;
      const shipping = 1;
      const metadata = Buffer.from([0x01]);
      const value = 3;
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata, { value });
      await processor.connect(seller).confirm(id, { value });
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
      expect(orderPrice).to.eq(2n, 'Price should be 2');
      expect(orderShipping).to.eq(1n, 'Shipping should be 1');
      expect(orderSubmittedBlock).to.eq(2n, 'Submitted block should be 2');
      expect(orderConfirmedBlock).to.eq(3n, 'Confirmed block should be 3');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(1n, 'State should be 1');
      expect(orderShipment).to.eq('0x', 'Shipment should be 0x');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the seller to handoff the order', async () => {
      const { processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      const id = 'testId';
      const price = 2;
      const shipping = 1;
      const metadata = Buffer.from([0x01]);
      const value = 3;
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata, { value });
      await processor.connect(seller).confirm(id, { value });
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
      expect(orderPrice).to.eq(2n, 'Price should be 2');
      expect(orderShipping).to.eq(1n, 'Shipping should be 1');
      expect(orderSubmittedBlock).to.eq(2n, 'Submitted block should be 2');
      expect(orderConfirmedBlock).to.eq(3n, 'Confirmed block should be 3');
      expect(orderShippedBlock).to.eq(0n, 'Shipped block should be 0');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(2n, 'State should be 2');
      expect(orderShipment).to.eq('0x02', 'Shipment should be 0x02');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the shipper to ship the order', async () => {
      const { processor, seller, buyer, shipper } = await loadFixture(deployOrderProcessorFixture);
      const id = 'testId';
      const price = 2;
      const shipping = 1;
      const metadata = Buffer.from([0x01]);
      const value = 3;
      await processor.connect(buyer).submit(id, shipper.address, price, shipping, metadata, { value });
      await processor.connect(seller).confirm(id, { value });
      const shipment = Buffer.from([0x02]);
      await processor.connect(seller).handOff(id, shipment);
      await processor.connect(shipper).ship(id, { value });
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
      expect(orderPrice).to.eq(2n, 'Price should be 2');
      expect(orderShipping).to.eq(1n, 'Shipping should be 1');
      expect(orderSubmittedBlock).to.eq(2n, 'Submitted block should be 2');
      expect(orderConfirmedBlock).to.eq(3n, 'Confirmed block should be 3');
      expect(orderShippedBlock).to.eq(5n, 'Shipped block should be 5');
      expect(orderDeliveredBlock).to.eq(0n, 'Delivered block should be 0');
      expect(orderState).to.eq(3n, 'State should be 3');
      expect(orderShipment).to.eq('0x02', 'Shipment should be 0x02');
      expect(orderMetadata).to.eq('0x01', 'Metadata should be 0x01');
    });

    it('Should allow the buyer to accept the order', async () => {

    });
  });
});