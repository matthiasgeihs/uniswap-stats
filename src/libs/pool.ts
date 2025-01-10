import { ethers, providers } from 'ethers'
import UniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'
import { Slot0 } from './types'

export class LiquidityPool {
  poolContract: ethers.Contract

  constructor(poolAddress: string, provider: providers.Provider) {
    this.poolContract = new ethers.Contract(
      poolAddress,
      UniswapV3Pool.abi,
      provider
    )
  }

  async getSlot0(blockTag?: providers.BlockTag): Promise<Slot0> {
    const slot0 = await this.poolContract.slot0({ blockTag })
    return {
      sqrtPriceX96: slot0.sqrtPriceX96,
      tick: slot0.tick,
      observationIndex: slot0.observationIndex,
      observationCardinality: slot0.observationCardinality,
      observationCardinalityNext: slot0.observationCardinalityNext,
      feeProtocol: slot0.feeProtocol,
      unlocked: slot0.unlocked,
    }
  }
}
