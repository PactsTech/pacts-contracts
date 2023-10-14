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
    address immutable buyer;
    address immutable shipper;
    mapping(address => uint256) deposits;
    uint256 createdBlock;
    uint256 shippedBlock;
    uint256 deliveredBlock;
    bool sellerShipped;
    bool shipperReceived;
    State state;
    bytes shipment;
    uint256 sequence;
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
    event Aborted(
        address indexed _buyer,
        address indexed _seller,
        string indexed _orderId
    );
    event Canceled(
        address indexed _buyer,
        address indexed _seller,
        string indexed _orderId
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

    modifier onlyAfterCreated() {
        require(
            block.number >= (createdBlockNumber + WAIT_BLOCKS),
            "Not long enough after created block"
        );
        _;
    }

    modifier onlyAfterShipped() {
        require(
            block.number >= (shippedBlockNumber + WAIT_BLOCKS),
            "Not long enough after shipped block"
        );
        _;
    }

    modifier onlyAfterDelivered() {
        require(
            block.number >= (deliveredBlockNumber + WAIT_BLOCKS),
            "Not long enough after delivered block"
        );
        _;
    }

    constructor() payable {
        seller = msg.sender;
    }

    function submit(string _orderId, address _shipper, bytes _metadata) external payable {
        seq = sequence++;
        orders[_orderId] = Order({
            buyer: msg.sender,
            shipper: _shipper,
            createdBlock: block.number,
            state: State.Submitted,
            sequence: seq,
            metadata: _metadata
        });
        orders[_orderId].deposits[msg.sender] = msg.value;
        emit Submitted(msg.sender, seller, _shipper, _orderId);
    }

    function confirm() external payable onlySeller inState(State.Paid) {
        require(msg.value >= price);
        bytes memory array = bytes(order);
        bytes memory encoded = abi.encodePacked(array);
        emit Confirmed(buyer, seller, shipper, encoded);
        state = State.Confirmed;
    }

    function handOff(
        bytes memory _shipment
    ) external payable onlySeller inState(State.Confirmed) {
        shipment = _shipment;
        bytes memory array = bytes(shipment);
        bytes memory encoded = abi.encodePacked(array);
        emit HandedOff(buyer, seller, shipper, encoded);
        state = State.HandedOff;
    }

    function ship() external payable onlyShipper inState(State.HandedOff) {
        require(msg.value >= price);
        emit Shipped(buyer, seller, shipper, shipment);
        state = State.Shipped;
    }

    function accept() external payable onlyBuyer inState(State.Shipped) {
        emit Accepted(buyer, seller, shipper, shipment);
        state = State.Accepted;
    }

    function deliver() external payable onlyShipper inState(State.Shipped) {
        emit Delivered(buyer, seller, shipper, shipment);
        deliveredBlockNumber = block.number;
        state = State.Delivered;
    }

    function cancel() external payable onlyBuyer inState(State.Paid) {
        bytes memory array = bytes(order);
        bytes memory encoded = abi.encodePacked(array);
        emit Canceled(buyer, seller, encoded);
        state = State.Canceled;
    }

    function abort() external payable onlySeller inState(State.Paid) {
        bytes memory array = bytes(order);
        bytes memory encoded = abi.encodePacked(array);
        emit Aborted(buyer, seller, encoded);
        state = State.Aborted;
    }

    function withdrawalAllowed(address payee) public view returns (bool) {
        if (payee == seller) {
            return
                state == State.Delivered &&
                block.number >= (deliveredBlockNumber + WAIT_BLOCKS);
        } else if (payee == shipper) {
            return
                state == State.Delivered &&
                block.number >= (deliveredBlockNumber + WAIT_BLOCKS);
        } else if (payee == buyer) {
            return state == State.Canceled || state == State.Aborted;
        }
        return false;
    }

    function withdraw(address payable payee) external {
        require(withdrawalAllowed(payee), "payee is not allowed to withdraw");
        uint256 payment = _deposits[payee];
        _deposits[payee] = 0;
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

    function getCreatedBlockNumber() public view returns (uint256) {
        return createdBlockNumber;
    }

    function getShippedBlockNumber() public view returns (uint256) {
        return shippedBlockNumber;
    }

    function getDeliveredBlockNumber() public view returns (uint256) {
        return deliveredBlockNumber;
    }

    function getOrder() public view returns (bytes memory) {
        return order;
    }

    function getState() public view returns (State) {
        return state;
    }
}
