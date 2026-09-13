// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}
interface ISwapRouter {
    struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }
    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256);
}

/// @notice A fixed-route, owner-authorized treasury executor. No arbitrary calldata.
/// @dev Each wallet authorizes its own plan. Does not attest simulation correctness.
contract ExitExecutor {
    struct Plan { uint256 amountIn; uint256 minOut; uint24 fee; address recipient; uint256 deadline; uint256 nonce; }
    ISwapRouter public immutable router;
    IERC20Minimal public immutable tokenIn;
    IERC20Minimal public immutable tokenOut;
    uint256 public immutable maxInput;
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    bool private entered;
    event ExitSettled(address indexed owner, bytes32 indexed planHash, address indexed recipient, uint256 amountIn, uint256 amountOut, uint24 fee, uint256 nonce);
    error Expired(); error InputLimit(); error WrongRecipient(); error Replay(); error UnsupportedPool(); error TokenTransfer(); error OutputBelowMinimum(); error Reentrant();
    constructor(address router_, address tokenIn_, address tokenOut_, uint256 maxInput_) {
        require(router_.code.length > 0 && tokenIn_.code.length > 0 && tokenOut_.code.length > 0 && tokenIn_ != tokenOut_ && maxInput_ > 0, 'Invalid deployment');
        router=ISwapRouter(router_);tokenIn=IERC20Minimal(tokenIn_);tokenOut=IERC20Minimal(tokenOut_);maxInput=maxInput_;
    }
    function execute(Plan calldata p) external returns(uint256 amountOut) {
        if(entered) revert Reentrant(); entered=true;
        if(p.deadline < block.timestamp || p.deadline > block.timestamp + 15 minutes) revert Expired();
        if(p.amountIn==0 || p.amountIn>maxInput || p.minOut==0) revert InputLimit();
        if(p.recipient!=msg.sender) revert WrongRecipient();
        if(usedNonces[msg.sender][p.nonce]) revert Replay();
        if(p.fee!=500 && p.fee!=3000) revert UnsupportedPool();
        usedNonces[msg.sender][p.nonce]=true;
        uint256 beforeBalance=tokenOut.balanceOf(p.recipient);
        if(!tokenIn.transferFrom(msg.sender,address(this),p.amountIn)) revert TokenTransfer();
        if(!tokenIn.approve(address(router),p.amountIn)) revert TokenTransfer();
        router.exactInputSingle(ISwapRouter.ExactInputSingleParams(address(tokenIn),address(tokenOut),p.fee,p.recipient,p.deadline,p.amountIn,p.minOut,0));
        if(!tokenIn.approve(address(router),0)) revert TokenTransfer();
        amountOut=tokenOut.balanceOf(p.recipient)-beforeBalance;
        if(amountOut<p.minOut) revert OutputBelowMinimum();
        bytes32 digest=keccak256(abi.encode(block.chainid,address(this),msg.sender,p));
        emit ExitSettled(msg.sender,digest,p.recipient,p.amountIn,amountOut,p.fee,p.nonce);
        entered=false;
    }
}
