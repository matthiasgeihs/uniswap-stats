import { BigNumber, BigNumberish, ethers, providers } from 'ethers'
import { POSITION_MANAGER_ADDRESS } from './config'
import INonFungiblePositionManager from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json'
import { LiquidityPosition } from './types'

export class LiquidityPositionManager {
  contract: ethers.Contract

  constructor(provider: providers.Provider) {
    this.contract = new ethers.Contract(
      POSITION_MANAGER_ADDRESS,
      INonFungiblePositionManager.abi,
      provider
    )
  }

  async getLiquidityPosition(
    positionId: BigNumberish
  ): Promise<LiquidityPosition> {
    const position = await this.contract.positions(positionId)
    return position
  }

  async getUncollected(positionId: BigNumberish): Promise<{
    amount0: BigNumber
    amount1: BigNumber
  }> {
    const maxAmount = BigNumber.from(2).pow(128).sub(1)
    return this.contract.callStatic.collect([
      positionId,
      ethers.constants.AddressZero,
      maxAmount,
      maxAmount,
    ])
  }

  async ownerOf(positionId: BigNumberish): Promise<string> {
    return this.contract.ownerOf(positionId)
  }
}
