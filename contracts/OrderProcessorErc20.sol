// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

enum State {
    Submitted,
    Confirmed,
    HandedOff,
    Shipped,
    Accepted,
    Delivered,
    Aborted,
    Canceled,
    Disputed
}

struct Order {
    uint256 sequence;
    address buyer;
    address shipper;
    uint256 price;
    uint256 shipping;
    mapping(address => uint256) deposits;
    uint256 submittedBlock;
    uint256 confirmedBlock;
    uint256 shippedBlock;
    uint256 deliveredBlock;
    State state;
    bytes shipment;
    bytes metadata;
}

contract OrderProcessorErc20 {
    uint8 public constant VERSION = 1;
    uint256 public constant WAIT_BLOCKS = 21300;

    uint256 sequence;
    IERC20 immutable token;
    address immutable seller;
    address immutable arbiter;
    mapping(string => Order) orders;

    event Submitted(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        string orderId
    );
    event Confirmed(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        string orderId
    );
    event HandedOff(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        bytes shipment
    );
    event Shipped(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        bytes _shipment
    );
    event Accepted(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        bytes shipment
    );
    event Delivered(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        bytes shipment
    );
    event Canceled(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        string orderId
    );
    event Aborted(
        address indexed buyer,
        address indexed seller_,
        address indexed shipper,
        string orderId
    );
    event Disputed(
        address indexed buyer,
        address indexed seller_,
        address indexed arbiter_,
        string orderId
    );
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(address token_, address arbiter_) {
        sequence = 1;
        token = IERC20(token_);
        seller = msg.sender;
        arbiter = arbiter_;
    }

    function submit(
        string memory orderId,
        address shipper,
        uint256 price,
        uint256 shipping,
        bytes memory metadata
    ) external {
        require(
            token.transferFrom(msg.sender, address(this), price + shipping),
            "Token transfer failed"
        );
        orders[orderId].sequence = sequence++;
        orders[orderId].buyer = msg.sender;
        orders[orderId].shipper = shipper;
        orders[orderId].price = price;
        orders[orderId].shipping = shipping;
        orders[orderId].deposits[msg.sender] = price + shipping;
        orders[orderId].submittedBlock = block.number;
        orders[orderId].state = State.Submitted;
        orders[orderId].metadata = metadata;
        emit Submitted(msg.sender, seller, shipper, orderId);
    }

    function confirm(string memory orderId) external {
        require(msg.sender == seller, "Only seller can confirm an order");
        Order storage order = orders[orderId];
        // require(msg.value >= order.price, "Not enough collateral");
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        // orders[orderId].deposits[msg.sender] = msg.value;
        orders[orderId].confirmedBlock = block.number;
        orders[orderId].state = State.Confirmed;
        address buyer = order.buyer;
        address shipper = order.shipper;
        emit Confirmed(buyer, seller, shipper, orderId);
    }

    function handOff(string memory orderId, bytes memory shipment) external {
        require(msg.sender == seller, "Only seller can confirm an order");
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Confirmed, "Order in incorrect state");
        require(seller == msg.sender, "Only seller can handoff order");
        orders[orderId].shipment = shipment;
        orders[orderId].state = State.HandedOff;
        emit HandedOff(order.buyer, seller, order.shipper, shipment);
    }

    function ship(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        // require(msg.value >= order.price, "Not enough collateral");
        require(order.state == State.HandedOff, "Order in incorrect state");
        require(order.shipper == msg.sender, "Only shipper can ship");
        // orders[orderId].deposits[msg.sender] = msg.value;
        orders[orderId].shippedBlock = block.number;
        orders[orderId].state = State.Shipped;
        emit Shipped(order.buyer, seller, order.shipper, order.shipment);
    }

    function accept(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only buyer can accept");
        orders[orderId].state = State.Accepted;
        emit Accepted(order.buyer, seller, order.shipper, order.shipment);
    }

    function deliver(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Accepted, "Order in incorrect state");
        require(order.shipper == msg.sender, "Only shipper can deliver");
        orders[orderId].state = State.Delivered;
        emit Delivered(order.buyer, seller, order.shipper, order.shipment);
    }

    function cancel(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only buyer can cancel an order");
        orders[orderId].state = State.Canceled;
        emit Canceled(order.buyer, seller, order.shipper, orderId);
    }

    function abort(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(seller == msg.sender, "Only seller can abort an order");
        orders[orderId].state = State.Aborted;
        emit Aborted(order.buyer, seller, order.shipper, orderId);
    }

    function dispute(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only a buyer can dispute");
        orders[orderId].state = State.Disputed;
        emit Disputed(order.buyer, seller, arbiter, orderId);
    }

    function withdrawalAllowed(
        string memory orderId,
        address payee
    ) public view returns (bool) {
        Order storage order = orders[orderId];
        if (payee == seller) {
            return
                order.state == State.Delivered &&
                block.number >= (order.deliveredBlock + WAIT_BLOCKS);
        } else if (payee == order.shipper) {
            return
                order.state == State.Delivered &&
                block.number >= (order.deliveredBlock + WAIT_BLOCKS);
        } else if (payee == order.buyer) {
            return
                order.state == State.Canceled || order.state == State.Aborted;
        }
        return false;
    }

    function withdraw(string memory orderId, address payable payee) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(
            withdrawalAllowed(orderId, payee),
            "payee is not allowed to withdraw"
        );
        uint256 payment = order.deposits[payee];
        orders[orderId].deposits[payee] = 0;
        require(
            address(this).balance >= payment,
            "Address: insufficient balance"
        );
        (bool success, ) = payee.call{value: payment}("");
        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );
    }

    function getOrder(
        string memory orderId
    )
        public
        view
        returns (
            uint256 sequence_,
            address buyer,
            address shipper,
            uint256 price,
            uint256 shipping,
            uint256 submittedBlock,
            uint256 confirmedBlock,
            uint256 shippedBlock,
            uint256 deliveredBlock,
            uint8 state,
            bytes memory shipment,
            bytes memory metadata
        )
    {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        sequence_ = order.sequence;
        buyer = order.buyer;
        shipper = order.shipper;
        price = order.price;
        shipping = order.shipping;
        submittedBlock = order.submittedBlock;
        confirmedBlock = order.confirmedBlock;
        shippedBlock = order.shippedBlock;
        deliveredBlock = order.deliveredBlock;
        state = uint8(order.state);
        shipment = order.shipment;
        metadata = order.metadata;
    }
}
