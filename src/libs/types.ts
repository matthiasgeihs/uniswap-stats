import { CurrencyAmount, Price, Token } from '@uniswap/sdk-core'
import { BigNumber } from 'ethers'

export type LiquidityPositionStats = {
  lowerTickPrice: Price<Token, Token>
  upperTickPrice: Price<Token, Token>
  currentPrice: Price<Token, Token>
  uncollected: CurrencyAmount<Token>[]
  current: CurrencyAmount<Token>[]
  deposited: CurrencyAmount<Token>[]
}

export type LiquidityPosition = {
  nonce: BigNumber
  operator: string
  token0: string
  token1: string
  fee: number
  tickLower: number
  tickUpper: number
  liquidity: BigNumber
  feeGrowthInside0LastX128: BigNumber
  feeGrowthInside1LastX128: BigNumber
  tokensOwed0: BigNumber
  tokensOwed1: BigNumber
}

export type Slot0 = {
  sqrtPriceX96: BigNumber
  tick: BigNumber
  observationIndex: BigNumber
  observationCardinality: BigNumber
  observationCardinalityNext: BigNumber
  feeProtocol: BigNumber
  unlocked: boolean
}
