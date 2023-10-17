import hre from 'hardhat';
import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs.js';
import { expect } from 'chai';

describe('OrderProcessor', () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const deployOrderProcessorFixture = async () => {
    const [seller, buyer, shipper] = await ethers.getSigners();
    const OrderProcessor = await ethers.getContractFactory('OrderProcessor');
    const processor = await OrderProcessor.deploy();
    return { processor, seller, buyer, shipper };
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
      const order = await processor.getOrder(id);
      expect(order[0]).to.eq(1n, 'Sequence should be 1');
      expect(order[1]).to.eq(buyer.address, 'Buyer should be set');
      expect(order[2]).to.eq(shipper.address, 'Shipper should be set');
      expect(order[3]).to.eq(2n, 'Price should be 2');
      expect(order[4]).to.eq(1n, 'Shipping should be 1');
      expect(order[5]).to.eq(2n, 'Submitted block should be 2');
      expect(order[6]).to.eq(0n, 'Confirmed block should be 0');
      expect(order[7]).to.eq(0n, 'Shipped block should be 0');
      expect(order[8]).to.eq(0n, 'Delivered block should be 0');
      expect(order[9]).to.eq(0n, 'State should be 0');
      expect(order[10]).to.eq('0x', 'Shipment should be 0x');
      expect(order[11]).to.eq('0x01', 'Metadata should be 0x01');
    });

    // it('Should receive and store the funds to lock', async function () {
    //   const { lock, lockedAmount } = await loadFixture(
    //     deployOrderProcessorFixture
    //   );

    //   expect(await ethers.provider.getBalance(lock.target)).to.equal(
    //     lockedAmount
    //   );
    // });

    // it('Should fail if the unlockTime is not in the future', async function () {
    //   // We don't use the fixture here because we want a different deployment
    //   const latestTime = await time.latest();
    //   const Lock = await ethers.getContractFactory('Lock');
    //   await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
    //     'Unlock time should be in the future'
    //   );
    // });
  });
});