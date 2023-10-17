// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

enum State {
    Submitted,
    Confirmed,
    HandedOff,
    Shipped,
    Accepted,
    Delivered,
    Aborted,
    Canceled
    // Disputed
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

contract OrderProcessor {
    uint8 public constant VERSION = 1;
    uint256 public constant WAIT_BLOCKS = 21300;

    uint256 sequence;
    address immutable seller;
    mapping(string => Order) orders;

    event Submitted(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        string _orderId
    );
    event Confirmed(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        string _orderId
    );
    event HandedOff(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        bytes _shipment
    );
    event Shipped(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        bytes _shipment
    );
    event Accepted(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        bytes _shipment
    );
    event Delivered(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        bytes _shipment
    );
    event Canceled(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        string _orderId
    );
    event Aborted(
        address indexed _buyer,
        address indexed _seller,
        address indexed _shipper,
        string _orderId
    );
    // event Disputed(
    //     address indexed _buyer,
    //     address indexed _seller,
    //     bytes indexed _order
    // );
    event Withdrawn(address indexed payee, uint256 amount);

    error OnlyBuyer();
    error OnlySeller();
    error OnlyShipper();
    error InvalidState();

    constructor() payable {
        sequence = 1;
        seller = msg.sender;
    }

    function submit(
        string memory _orderId,
        address _shipper,
        uint256 _price,
        uint256 _shipping,
        bytes memory _metadata
    ) external payable {
        require(
            msg.value >= (_price + _shipping),
            "Value is less than price + shipping"
        );
        orders[_orderId].sequence = sequence++;
        orders[_orderId].buyer = msg.sender;
        orders[_orderId].shipper = _shipper;
        orders[_orderId].price = _price;
        orders[_orderId].shipping = _shipping;
        orders[_orderId].deposits[msg.sender] = msg.value;
        orders[_orderId].submittedBlock = block.number;
        orders[_orderId].state = State.Submitted;
        orders[_orderId].metadata = _metadata;
        emit Submitted(msg.sender, seller, _shipper, _orderId);
    }

    function confirm(string memory _orderId) external payable {
        require(msg.sender == seller, "Only seller can confirm an order");
        Order storage order = orders[_orderId];
        require(msg.value >= order.price, "Not enough collateral");
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        orders[_orderId].deposits[msg.sender] = msg.value;
        orders[_orderId].confirmedBlock = block.number;
        orders[_orderId].state = State.Confirmed;
        address buyer = order.buyer;
        address shipper = order.shipper;
        emit Confirmed(buyer, seller, shipper, _orderId);
    }

    function handOff(
        string memory _orderId,
        bytes memory _shipment
    ) external payable {
        require(msg.sender == seller, "Only seller can confirm an order");
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Confirmed, "Order in incorrect state");
        orders[_orderId].shipment = _shipment;
        orders[_orderId].state = State.HandedOff;
        emit HandedOff(order.buyer, seller, order.shipper, _shipment);
    }

    function ship(string memory _orderId) external payable {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.HandedOff, "Order in incorrect state");
        require(order.shipper == msg.sender);
        orders[_orderId].deposits[msg.sender] = msg.value;
        orders[_orderId].shippedBlock = block.number;
        emit Shipped(order.buyer, seller, order.shipper, order.shipment);
    }

    function accept(string memory _orderId) external payable {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        require(order.buyer == msg.sender);
        orders[_orderId].state = State.Accepted;
        emit Accepted(order.buyer, seller, order.shipper, order.shipment);
    }

    function deliver(string memory _orderId) external payable {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Accepted, "Order in incorrect state");
        require(order.shipper == msg.sender);
        orders[_orderId].state = State.Delivered;
        emit Delivered(order.buyer, seller, order.shipper, order.shipment);
    }

    function cancel(string memory _orderId) external payable {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(order.buyer == msg.sender);
        orders[_orderId].state = State.Canceled;
        emit Canceled(order.buyer, seller, order.shipper, _orderId);
    }

    function abort(string memory _orderId) external payable {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(seller == msg.sender);
        orders[_orderId].state = State.Aborted;
        emit Aborted(order.buyer, seller, order.shipper, _orderId);
    }

    function withdrawalAllowed(
        string memory _orderId,
        address payee
    ) public view returns (bool) {
        Order storage order = orders[_orderId];
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

    function withdraw(string memory _orderId, address payable payee) external {
        Order storage order = orders[_orderId];
        require(order.sequence > 0, "Order does not exist");
        require(
            withdrawalAllowed(_orderId, payee),
            "payee is not allowed to withdraw"
        );
        uint256 payment = order.deposits[payee];
        orders[_orderId].deposits[payee] = 0;
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
}
