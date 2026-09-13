// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IPool {function mint(address,int24,int24,uint128,bytes calldata) external returns(uint256,uint256);function token0() external view returns(address);function token1() external view returns(address);}
interface IToken {function transferFrom(address,address,uint256) external returns(bool);}
/// @notice Test fixture only; callback is bound to the pool active in seed().
contract LiquiditySeeder {
 address private activePool;address private payer;
 function seed(address pool,int24 lower,int24 upper,uint128 liquidity) external {require(activePool==address(0));activePool=pool;payer=msg.sender;IPool(pool).mint(msg.sender,lower,upper,liquidity,'');activePool=address(0);payer=address(0);}
 function uniswapV3MintCallback(uint256 a,uint256 b,bytes calldata) external {require(msg.sender==activePool && activePool!=address(0),'Invalid callback');if(a>0)require(IToken(IPool(msg.sender).token0()).transferFrom(payer,msg.sender,a));if(b>0)require(IToken(IPool(msg.sender).token1()).transferFrom(payer,msg.sender,b));}
}
