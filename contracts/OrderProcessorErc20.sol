// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderProcessorErc20 is AccessControlEnumerable {
    enum State {
        Submitted,
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
        bytes buyerPublicKey;
        uint256 price;
        uint256 shipping;
        mapping(address => uint256) deposits;
        uint256 submittedBlock;
        uint256 shippedBlock;
        uint256 deliveredBlock;
        uint256 failedBlock;
        State state;
        bytes metadata;
        bytes shipmentBuyer;
        bytes shipmentReporter;
        bytes shipmentArbiter;
    }

    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    uint8 public constant VERSION = 1;
    uint256 public constant WAIT_BLOCKS = 21300;

    string public name;
    string public reporterPublicKey;
    string public arbiterPublicKey;
    address public immutable token;
    IERC20 immutable erc20;

    uint256 sequence;
    mapping(string => Order) orders;

    event Deployed(
        address indexed seller,
        address indexed reporter,
        address indexed arbiter,
        string name
    );
    event Submitted(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        string name
    );
    event Shipped(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Delivered(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Failed(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Aborted(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId
    );
    event Disputed(
        address indexed seller,
        address indexed buyer,
        address indexed arbiter,
        string orderId
    );
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(
        string memory name_,
        address reporter,
        string memory reporterPublicKey_,
        address arbiter,
        string memory arbiterPublicKey_,
        address token_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, reporter);
        _grantRole(ARBITER_ROLE, arbiter);
        name = name_;
        reporterPublicKey = reporterPublicKey_;
        arbiterPublicKey = arbiterPublicKey_;
        token = token_;
        erc20 = IERC20(token_);
        sequence = 1;
        emit Deployed(msg.sender, reporter, arbiter, name);
    }

    function submit(
        string memory orderId,
        bytes memory buyerPublicKey,
        uint256 price,
        uint256 shipping,
        bytes memory metadata
    ) external {
        // TODO validate buyer public key?
        orders[orderId].sequence = sequence++;
        orders[orderId].buyer = msg.sender;
        orders[orderId].buyerPublicKey = buyerPublicKey;
        orders[orderId].price = price;
        orders[orderId].shipping = shipping;
        orders[orderId].deposits[msg.sender] = price + shipping;
        orders[orderId].submittedBlock = block.number;
        orders[orderId].state = State.Submitted;
        orders[orderId].metadata = metadata;
        address seller = getSeller();
        address reporter = getReporter();
        emit Submitted(seller, msg.sender, reporter, orderId, name);
        require(
            erc20.transferFrom(msg.sender, address(this), price + shipping),
            "Token transfer failed"
        );
    }

    function ship(
        string memory orderId,
        bytes memory shipmentBuyer,
        bytes memory shipmentReporter
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        orders[orderId].shippedBlock = block.number;
        orders[orderId].state = State.Shipped;
        orders[orderId].shipmentBuyer = shipmentBuyer;
        orders[orderId].shipmentReporter = shipmentReporter;
        address seller = getSeller();
        address reporter = getReporter();
        emit Shipped(
            seller,
            order.buyer,
            reporter,
            orderId,
            shipmentBuyer,
            shipmentReporter
        );
    }

    function deliver(string memory orderId) external onlyRole(REPORTER_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        orders[orderId].deliveredBlock = block.number;
        orders[orderId].state = State.Delivered;
        address seller = getSeller();
        address reporter = getReporter();
        emit Delivered(
            seller,
            order.buyer,
            reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function fail(string memory orderId) external onlyRole(REPORTER_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        orders[orderId].failedBlock = block.number;
        orders[orderId].state = State.Failed;
        address seller = getSeller();
        address reporter = getReporter();
        emit Failed(
            seller,
            order.buyer,
            reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function abort(
        string memory orderId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        orders[orderId].state = State.Aborted;
        address seller = getSeller();
        address reporter = getReporter();
        emit Aborted(seller, order.buyer, reporter, orderId);
    }

    function dispute(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only a buyer can dispute");
        orders[orderId].state = State.Disputed;
        address seller = getSeller();
        address arbiter = getArbiter();
        emit Disputed(seller, order.buyer, arbiter, orderId);
    }

    function withdrawalAllowed(
        string memory orderId,
        address payee
    ) public view returns (bool) {
        Order storage order = orders[orderId];
        address seller = getSeller();
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
            erc20.transfer(address(payee), payment),
            "Token transfer failed"
        );
    }

    function getReporterPublicKey() public view returns (string memory) {
        return reporterPublicKey;
    }

    function getArbiterPublicKey() public view returns (string memory) {
        return arbiterPublicKey;
    }

    function getOrder(
        string memory orderId
    )
        public
        view
        returns (
            uint256 sequence_,
            address buyer,
            bytes memory buyerPublicKey,
            uint256 price,
            uint256 shipping,
            uint256 submittedBlock,
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
        buyerPublicKey = order.buyerPublicKey;
        price = order.price;
        shipping = order.shipping;
        submittedBlock = order.submittedBlock;
        shippedBlock = order.shippedBlock;
        deliveredBlock = order.deliveredBlock;
        state = uint8(order.state);
        metadata = order.metadata;
        shipmentBuyer = order.shipmentBuyer;
        shipmentReporter = order.shipmentReporter;
    }

    function getSeller() internal view returns (address) {
        return getRoleMember(DEFAULT_ADMIN_ROLE, 0);
    }

    function getReporter() internal view returns (address) {
        return getRoleMember(REPORTER_ROLE, 0);
    }

    function getArbiter() internal view returns (address) {
        return getRoleMember(ARBITER_ROLE, 0);
    }
}
