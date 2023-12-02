// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

enum State {
    Submitted,
    Confirmed,
    Shipped,
    Delivered,
    Failed,
    Aborted,
    Canceled,
    Disputed
}

struct Order {
    uint256 sequence;
    address buyer;
    uint256 price;
    uint256 shipping;
    mapping(address => uint256) deposits;
    uint256 submittedBlock;
    uint256 confirmedBlock;
    uint256 shippedBlock;
    uint256 deliveredBlock;
    uint256 failedBlock;
    State state;
    bytes metadata;
    bytes shipmentBuyer;
    bytes shipmentReporter;
}

contract OrderProcessorErc20Reporter {
    uint8 public constant VERSION = 1;
    uint256 public constant WAIT_BLOCKS = 21300;

    uint256 sequence;
    IERC20 immutable token;
    address immutable seller;
    address immutable reporter;
    address immutable arbiter;
    mapping(string => Order) orders;

    event Submitted(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId
    );
    event Confirmed(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId
    );
    event Shipped(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Delivered(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Failed(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Aborted(
        address indexed buyer,
        address indexed seller_,
        address indexed reporter_,
        string orderId
    );
    event Disputed(
        address indexed buyer,
        address indexed seller_,
        address indexed arbiter_,
        string orderId
    );
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(address token_, address reporter_, address arbiter_) {
        sequence = 1;
        token = IERC20(token_);
        seller = msg.sender;
        reporter = reporter_;
        arbiter = arbiter_;
    }

    function submit(
        string memory orderId,
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
        orders[orderId].price = price;
        orders[orderId].shipping = shipping;
        orders[orderId].deposits[msg.sender] = price + shipping;
        orders[orderId].submittedBlock = block.number;
        orders[orderId].state = State.Submitted;
        orders[orderId].metadata = metadata;
        emit Submitted(msg.sender, seller, reporter, orderId);
    }

    function confirm(string memory orderId) external {
        require(msg.sender == seller, "Only seller can confirm an order");
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        orders[orderId].confirmedBlock = block.number;
        orders[orderId].state = State.Confirmed;
        address buyer = order.buyer;
        emit Confirmed(buyer, seller, reporter, orderId);
    }

    function ship(
        string memory orderId,
        bytes memory shipmentBuyer,
        bytes memory shipmentReporter
    ) external {
        require(seller == msg.sender, "Only seller can ship");
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Confirmed, "Order in incorrect state");
        orders[orderId].shippedBlock = block.number;
        orders[orderId].state = State.Shipped;
        orders[orderId].shipmentBuyer = shipmentBuyer;
        orders[orderId].shipmentReporter = shipmentReporter;
        emit Shipped(
            order.buyer,
            seller,
            reporter,
            orderId,
            shipmentBuyer,
            shipmentReporter
        );
    }

    function deliver(string memory orderId) external {
        require(reporter == msg.sender, "Only reporter can deliver");
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        orders[orderId].deliveredBlock = block.number;
        orders[orderId].state = State.Delivered;
        emit Delivered(
            order.buyer,
            seller,
            reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function fail(string memory orderId) external {
        require(reporter == msg.sender, "Only reporter can fail");
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        orders[orderId].failedBlock = block.number;
        orders[orderId].state = State.Failed;
        emit Failed(
            order.buyer,
            seller,
            reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function abort(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(seller == msg.sender, "Only seller can abort an order");
        orders[orderId].state = State.Aborted;
        emit Aborted(order.buyer, seller, reporter, orderId);
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
        } else if (payee == order.buyer) {
            return
                order.state == State.Canceled || order.state == State.Aborted;
        }
        return false;
    }

    function withdraw(string memory orderId, address payee) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(
            withdrawalAllowed(orderId, payee),
            "payee is not allowed to withdraw"
        );
        uint256 payment = order.deposits[payee];
        orders[orderId].deposits[payee] = 0;
        require(
            token.transfer(address(payee), payment),
            "Token transfer failed"
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
            uint256 price,
            uint256 shipping,
            uint256 submittedBlock,
            uint256 confirmedBlock,
            uint256 shippedBlock,
            uint256 deliveredBlock,
            uint8 state,
            bytes memory metadata,
            bytes memory shipmentBuyer,
            bytes memory shipmentReporter
        )
    {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        sequence_ = order.sequence;
        buyer = order.buyer;
        price = order.price;
        shipping = order.shipping;
        submittedBlock = order.submittedBlock;
        confirmedBlock = order.confirmedBlock;
        shippedBlock = order.shippedBlock;
        deliveredBlock = order.deliveredBlock;
        state = uint8(order.state);
        metadata = order.metadata;
        shipmentBuyer = order.shipmentBuyer;
        shipmentReporter = order.shipmentReporter;
    }
}
