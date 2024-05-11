// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OrderProcessorErc20 is AccessControlEnumerable {
    enum State {
        Submitted,
        Shipped,
        Delivered,
        Completed,
        Failed,
        Canceled,
        Aborted,
        Disputed,
        Resolved
    }

    struct Order {
        uint256 sequence;
        State state;
        address buyer;
        bytes32 buyerPublicKey;
        address reporter;
        bytes32 reporterPublicKey;
        address arbiter;
        bytes32 arbiterPublicKey;
        uint256 price;
        uint256 shipping;
        uint256 lastModifiedBlock;
        mapping(address => uint256) deposits;
        bytes metadata;
        bytes shipmentBuyer;
        bytes shipmentReporter;
        bytes shipmentArbiter;
        string disputeUrl;
    }

    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    uint8 public constant VERSION = 1;

    string public storeName;
    uint256 public immutable cancelBlocks;
    uint256 public immutable disputeBlocks;
    bytes32 public reporterPublicKey;
    bytes32 public arbiterPublicKey;
    address public immutable token;
    IERC20 immutable erc20;

    uint256 sequence;
    mapping(string => Order) orders;

    event Deployed(
        address indexed seller,
        address indexed reporter,
        address indexed arbiter,
        string storeName_,
        uint256 cancelBlocks_,
        uint256 disputeBlocks_,
        address token_
    );
    event Submitted(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        string storeName_,
        uint256 price,
        uint256 shipping
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
    event Completed(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId
    );
    event Failed(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId,
        bytes shipmentBuyer,
        bytes shipmentReporter
    );
    event Canceled(
        address indexed seller,
        address indexed buyer,
        address indexed reporter,
        string orderId
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
        string orderId,
        string disputeUrl
    );
    event Resolved(
        address indexed seller,
        address indexed buyer,
        address indexed arbiter,
        string orderId
    );
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(
        string memory storeName_,
        uint256 cancelBlocks_,
        uint256 disputeBlocks_,
        address reporter,
        bytes32 reporterPublicKey_,
        address arbiter,
        bytes32 arbiterPublicKey_,
        address token_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        updateReporter(reporter, reporterPublicKey_);
        updateArbiter(arbiter, arbiterPublicKey_);
        storeName = storeName_;
        cancelBlocks = cancelBlocks_;
        disputeBlocks = disputeBlocks_;
        token = token_;
        erc20 = IERC20(token_);
        sequence = 1;
        emit Deployed(
            msg.sender,
            reporter,
            arbiter,
            storeName,
            cancelBlocks,
            disputeBlocks,
            token
        );
    }

    function submit(
        string memory orderId,
        bytes32 buyerPublicKey,
        address reporter,
        address arbiter,
        uint256 price,
        uint256 shipping,
        bytes memory metadata
    ) external {
        address currentReporter = getReporter();
        require(reporter == currentReporter, "Reporter is not current");
        address currentArbiter = getArbiter();
        require(arbiter == currentArbiter, "Arbiter is not current");
        Order storage order = orders[orderId];
        require(order.sequence == 0, "Order already exists");
        address seller = getSeller();
        orders[orderId].sequence = sequence++;
        orders[orderId].state = State.Submitted;
        orders[orderId].buyer = msg.sender;
        orders[orderId].buyerPublicKey = buyerPublicKey;
        orders[orderId].reporter = reporter;
        orders[orderId].reporterPublicKey = reporterPublicKey;
        orders[orderId].arbiter = arbiter;
        orders[orderId].arbiterPublicKey = arbiterPublicKey;
        orders[orderId].price = price;
        orders[orderId].shipping = shipping;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].deposits[seller] = price + shipping;
        orders[orderId].metadata = metadata;
        emit Submitted(
            seller,
            msg.sender,
            currentReporter,
            orderId,
            storeName,
            price,
            shipping
        );
        require(
            erc20.transferFrom(msg.sender, address(this), price + shipping),
            "Token transfer failed"
        );
    }

    function ship(
        string memory orderId,
        bytes memory shipmentBuyer,
        bytes memory shipmentReporter,
        bytes memory shipmentArbiter
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        orders[orderId].state = State.Shipped;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].shipmentBuyer = shipmentBuyer;
        orders[orderId].shipmentReporter = shipmentReporter;
        orders[orderId].shipmentArbiter = shipmentArbiter;
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

    function deliver(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        require(order.reporter == msg.sender);
        orders[orderId].state = State.Delivered;
        orders[orderId].lastModifiedBlock = block.number;
        address seller = getSeller();
        emit Delivered(
            seller,
            order.buyer,
            order.reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function fail(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Shipped, "Order in incorrect state");
        require(order.reporter == msg.sender);
        orders[orderId].state = State.Failed;
        orders[orderId].lastModifiedBlock = block.number;
        address seller = getSeller();
        emit Failed(
            seller,
            order.buyer,
            order.reporter,
            orderId,
            order.shipmentBuyer,
            order.shipmentReporter
        );
    }

    function complete(
        string memory orderId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Delivered, "Order in incorrect state");
        require(
            block.number >= order.lastModifiedBlock + disputeBlocks,
            "Not enought blocks have passed"
        );
        uint256 amount = order.deposits[msg.sender];
        orders[orderId].state = State.Completed;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].deposits[msg.sender] = 0;
        emit Completed(msg.sender, order.buyer, order.reporter, orderId);
        require(erc20.transfer(msg.sender, amount), "Token transfer failed");
    }

    function cancel(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only the buyer can cancel");
        require(
            block.number >= order.lastModifiedBlock + cancelBlocks,
            "Not enought blocks have passed"
        );
        address seller = getSeller();
        uint256 amount = order.deposits[seller];
        orders[orderId].state = State.Canceled;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].deposits[seller] = 0;
        address reporter = getReporter();
        emit Canceled(seller, msg.sender, reporter, orderId);
        require(erc20.transfer(msg.sender, amount), "Token transfer failed");
    }

    function abort(
        string memory orderId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Submitted, "Order in incorrect state");
        address seller = getSeller();
        orders[orderId].state = State.Aborted;
        orders[orderId].lastModifiedBlock = block.number;
        address reporter = getReporter();
        emit Aborted(seller, msg.sender, reporter, orderId);
    }

    function dispute(string memory orderId, string memory disputeUrl) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Delivered, "Order in incorrect state");
        require(order.buyer == msg.sender, "Only the buyer can dispute");
        orders[orderId].state = State.Disputed;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].disputeUrl = disputeUrl;
        address seller = getSeller();
        emit Disputed(seller, order.buyer, order.arbiter, orderId, disputeUrl);
    }

    function resolve(
        string memory orderId,
        uint256 sellerDeposit,
        uint256 buyerDeposit
    ) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        require(order.state == State.Disputed, "Order in incorrect state");
        require(order.arbiter == msg.sender, "Only a arbiter can resolve");
        address seller = getSeller();
        require(
            orders[orderId].deposits[seller] == (sellerDeposit + buyerDeposit),
            "Invalid deposit amounts"
        );
        orders[orderId].state = State.Resolved;
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].deposits[seller] = sellerDeposit;
        orders[orderId].deposits[order.buyer] = buyerDeposit;
        emit Resolved(seller, order.buyer, order.arbiter, orderId);
    }

    function withdraw(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        address seller = getSeller();
        bool sellerCanWithdraw = msg.sender == seller &&
            order.state == State.Resolved;
        bool buyerCanWithdraw = msg.sender == order.buyer &&
            (order.state == State.Aborted || order.state == State.Resolved);
        require(
            (sellerCanWithdraw || buyerCanWithdraw) &&
                orders[orderId].deposits[msg.sender] > 0,
            "payee can't withdraw"
        );
        uint256 amount = order.deposits[msg.sender];
        orders[orderId].lastModifiedBlock = block.number;
        orders[orderId].deposits[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
        require(erc20.transfer(msg.sender, amount), "Token transfer failed");
    }

    function updateReporter(
        address reporter,
        bytes32 reporterPublicKey_
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeAllRoleMembers(REPORTER_ROLE);
        _grantRole(REPORTER_ROLE, reporter);
        reporterPublicKey = reporterPublicKey_;
    }

    function updateArbiter(
        address arbiter,
        bytes32 arbiterPublicKey_
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeAllRoleMembers(ARBITER_ROLE);
        _grantRole(ARBITER_ROLE, arbiter);
        arbiterPublicKey = arbiterPublicKey_;
    }

    function getOrder(
        string memory orderId
    )
        public
        view
        returns (
            uint256 sequence_,
            uint8 state,
            address buyer,
            bytes32 buyerPublicKey,
            address reporter,
            bytes32 reporterPublicKey_,
            address arbiter,
            bytes32 arbiterPublicKey_,
            uint256 price,
            uint256 shipping,
            uint256 lastModifiedBlock,
            bytes memory metadata,
            bytes memory shipmentBuyer,
            bytes memory shipmentReporter,
            bytes memory shipmentArbiter,
            string memory disputeUrl
        )
    {
        Order storage order = orders[orderId];
        require(order.sequence > 0, "Order does not exist");
        sequence_ = order.sequence;
        state = uint8(order.state);
        buyer = order.buyer;
        buyerPublicKey = order.buyerPublicKey;
        reporter = order.reporter;
        reporterPublicKey_ = order.reporterPublicKey;
        arbiter = order.arbiter;
        arbiterPublicKey_ = order.arbiterPublicKey;
        price = order.price;
        shipping = order.shipping;
        lastModifiedBlock = order.lastModifiedBlock;
        metadata = order.metadata;
        shipmentBuyer = order.shipmentBuyer;
        shipmentReporter = order.shipmentReporter;
        shipmentArbiter = order.shipmentArbiter;
        disputeUrl = order.disputeUrl;
    }

    function getSeller() public view returns (address) {
        return getRoleMember(DEFAULT_ADMIN_ROLE, 0);
    }

    function getReporter() public view returns (address) {
        return getRoleMember(REPORTER_ROLE, 0);
    }

    function getArbiter() public view returns (address) {
        return getRoleMember(ARBITER_ROLE, 0);
    }

    // TODO possibly override grantRole/revokeRole to ensure not multiple reporters,arbiters

    function _revokeAllRoleMembers(bytes32 role) internal {
        uint256 count = getRoleMemberCount(role);
        for (uint256 i = 0; i < count; i++) {
            address member = getRoleMember(role, i);
            _revokeRole(role, member);
        }
    }
}
