import { ethers, providers } from 'ethers'
import { POOL_FACTORY_ADDRESS } from './config'
import UniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json'

export class PoolFactory {
  contract: ethers.Contract

  constructor(provider: providers.Provider) {
    this.contract = new ethers.Contract(
      POOL_FACTORY_ADDRESS,
      UniswapV3Factory.abi,
      provider
    )
  }

  async getLiquidityPoolAddress(
    token0: string,
    token1: string,
    fee: number
  ): Promise<string> {
    const pool = this.contract.getPool(token0, token1, fee)
    return pool
  }
}
