import { CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core'
import { BigNumber } from 'ethers'

export type LiquidityPositionStats = {
  positionId: BigNumber
  lowerTickPrice: Price<Token, Token>
  upperTickPrice: Price<Token, Token>
  currentPrice: Price<Token, Token>
  uncollected: CurrencyAmount<Token>[]
  current: CurrencyAmount<Token>[]
  deposited: CurrencyAmount<Token>[]
  avgDepositPrice: Price<Token, Token>
  withdrawn: CurrencyAmount<Token>[]
  avgWithdrawnPrice: Price<Token, Token> | undefined
  collected: CurrencyAmount<Token>[]
  avgCollectedPrice: Price<Token, Token> | undefined
  dateOpened: Date
  dateClosed: Date | undefined
  durationPositionHeld: number
  totalYield: CurrencyAmount<Token>[]
  yieldPerDay: CurrencyAmount<Token>[]
  apr: Fraction[]
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
