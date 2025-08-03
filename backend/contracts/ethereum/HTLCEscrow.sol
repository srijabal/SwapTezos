// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title HTLCEscrow
 * @dev Hash Time-Locked Contract for cross-chain atomic swaps between Ethereum and Tezos
 * Supports both ETH and ERC20 token escrows with hash-lock and time-lock mechanisms
 */
contract HTLCEscrow is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event SwapCreated(
        uint256 indexed swapId,
        address indexed maker,
        address indexed taker,
        uint256 amount,
        address tokenAddress,
        bytes32 secretHash,
        uint256 timelock
    );
    
    event SwapClaimed(
        uint256 indexed swapId,
        address indexed claimer,
        bytes32 secret
    );
    
    event SwapRefunded(
        uint256 indexed swapId,
        address indexed maker
    );

    // Swap status enum
    enum SwapStatus { ACTIVE, CLAIMED, REFUNDED }

    // Swap struct
    struct Swap {
        uint256 swapId;
        address maker;
        address taker; // Can be zero address for open swaps
        uint256 amount;
        address tokenAddress; // Zero address for ETH swaps
        bytes32 secretHash;
        uint256 timelock;
        SwapStatus status;
        uint256 createdAt;
    }

    // State variables
    uint256 public nextSwapId = 1;
    mapping(uint256 => Swap) public swaps;
    mapping(bytes32 => bool) public usedSecretHashes;
    
    // Fee configuration
    uint256 public feePercentage = 10; // 0.1% (10 basis points)
    uint256 public constant MAX_FEE = 500; // 5% max fee
    uint256 public collectedFees = 0;

    // Timing constraints
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 168 hours; // 1 week

    constructor() {}

    /**
     * @dev Create a new HTLC swap escrow
     * @param taker Address of the taker (can be zero for open swaps)
     * @param secretHash Hash of the secret for claiming
     * @param timelockHours Timelock duration in hours
     * @param tokenAddress Token contract address (zero for ETH)
     * @param tokenAmount Amount of tokens (ignored for ETH swaps)
     */
    function createSwap(
        address taker,
        bytes32 secretHash,
        uint256 timelockHours,
        address tokenAddress,
        uint256 tokenAmount
    ) external payable whenNotPaused nonReentrant {
        require(timelockHours >= 1, "TIMELOCK_TOO_SHORT");
        require(timelockHours <= 168, "TIMELOCK_TOO_LONG");
        require(secretHash != bytes32(0), "INVALID_SECRET_HASH");
        require(!usedSecretHashes[secretHash], "SECRET_HASH_ALREADY_USED");

        uint256 timelock = block.timestamp + (timelockHours * 1 hours);
        uint256 swapId = nextSwapId++;
        uint256 amount;

        if (tokenAddress == address(0)) {
            // ETH swap
            require(msg.value > 0, "AMOUNT_REQUIRED");
            
            // Calculate and collect fee
            uint256 feeAmount = (msg.value * feePercentage) / 10000;
            amount = msg.value - feeAmount;
            collectedFees += feeAmount;
        } else {
            // ERC20 token swap
            require(tokenAmount > 0, "TOKEN_AMOUNT_REQUIRED");
            require(msg.value == 0, "NO_ETH_FOR_TOKEN_SWAP");
            
            IERC20 token = IERC20(tokenAddress);
            require(token.balanceOf(msg.sender) >= tokenAmount, "INSUFFICIENT_TOKEN_BALANCE");
            require(token.allowance(msg.sender, address(this)) >= tokenAmount, "INSUFFICIENT_ALLOWANCE");
            
            // Transfer tokens to contract
            token.safeTransferFrom(msg.sender, address(this), tokenAmount);
            amount = tokenAmount;
        }

        // Create swap record
        Swap memory swap = Swap({
            swapId: swapId,
            maker: msg.sender,
            taker: taker,
            amount: amount,
            tokenAddress: tokenAddress,
            secretHash: secretHash,
            timelock: timelock,
            status: SwapStatus.ACTIVE,
            createdAt: block.timestamp
        });

        swaps[swapId] = swap;
        usedSecretHashes[secretHash] = true;

        emit SwapCreated(
            swapId,
            msg.sender,
            taker,
            amount,
            tokenAddress,
            secretHash,
            timelock
        );
    }

    /**
     * @dev Claim a swap by revealing the correct secret
     * @param swapId ID of the swap to claim
     * @param secret The secret that hashes to the stored secretHash
     */
    function claimSwap(
        uint256 swapId,
        bytes32 secret
    ) external whenNotPaused nonReentrant {
        Swap storage swap = swaps[swapId];
        
        require(swap.maker != address(0), "SWAP_NOT_FOUND");
        require(swap.status == SwapStatus.ACTIVE, "SWAP_NOT_ACTIVE");
        require(block.timestamp < swap.timelock, "SWAP_EXPIRED");
        require(keccak256(abi.encodePacked(secret)) == swap.secretHash, "INVALID_SECRET");
        
        // Verify claimer authorization (if taker is specified)
        if (swap.taker != address(0)) {
            require(msg.sender == swap.taker, "UNAUTHORIZED_CLAIMER");
        }

        // Update swap status
        swap.status = SwapStatus.CLAIMED;

        // Transfer escrowed assets
        if (swap.tokenAddress == address(0)) {
            // Transfer ETH
            (bool success, ) = payable(msg.sender).call{value: swap.amount}("");
            require(success, "ETH_TRANSFER_FAILED");
        } else {
            // Transfer ERC20 tokens
            IERC20(swap.tokenAddress).safeTransfer(msg.sender, swap.amount);
        }

        emit SwapClaimed(swapId, msg.sender, secret);
    }

    /**
     * @dev Refund an expired swap back to the maker
     * @param swapId ID of the swap to refund
     */
    function refundSwap(uint256 swapId) external nonReentrant {
        Swap storage swap = swaps[swapId];
        
        require(swap.maker != address(0), "SWAP_NOT_FOUND");
        require(swap.status == SwapStatus.ACTIVE, "SWAP_NOT_ACTIVE");
        require(block.timestamp >= swap.timelock, "SWAP_NOT_EXPIRED");
        require(msg.sender == swap.maker, "UNAUTHORIZED_REFUNDER");

        // Update swap status
        swap.status = SwapStatus.REFUNDED;

        // Return escrowed assets to maker
        if (swap.tokenAddress == address(0)) {
            // Return ETH
            (bool success, ) = payable(swap.maker).call{value: swap.amount}("");
            require(success, "ETH_REFUND_FAILED");
        } else {
            // Return ERC20 tokens
            IERC20(swap.tokenAddress).safeTransfer(swap.maker, swap.amount);
        }

        emit SwapRefunded(swapId, swap.maker);
    }

    /**
     * @dev Get swap details by ID
     * @param swapId ID of the swap
     * @return Swap details
     */
    function getSwap(uint256 swapId) external view returns (Swap memory) {
        require(swaps[swapId].maker != address(0), "SWAP_NOT_FOUND");
        return swaps[swapId];
    }

    /**
     * @dev Check if a secret hash has been used
     * @param secretHash The secret hash to check
     * @return Whether the secret hash has been used
     */
    function isSecretHashUsed(bytes32 secretHash) external view returns (bool) {
        return usedSecretHashes[secretHash];
    }

    // Admin functions
    
    /**
     * @dev Set fee percentage (owner only)
     * @param newFee New fee percentage in basis points
     */
    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "FEE_TOO_HIGH");
        feePercentage = newFee;
    }

    /**
     * @dev Pause contract operations (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw collected fees (owner only)
     * @param recipient Address to receive the fees
     */
    function withdrawFees(address payable recipient) external onlyOwner {
        require(collectedFees > 0, "NO_FEES_TO_WITHDRAW");
        require(recipient != address(0), "INVALID_RECIPIENT");
        
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "FEE_WITHDRAWAL_FAILED");
    }

    /**
     * @dev Emergency function to recover stuck tokens (owner only)
     * Should only be used for tokens sent by mistake
     */
    function emergencyRecoverToken(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "INVALID_RECIPIENT");
        IERC20(tokenAddress).safeTransfer(recipient, amount);
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get contract token balance
     */
    function getContractTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }
}