import { BigNumber, BigNumberish, providers } from 'ethers'
import { LiquidityPositionStats } from './types'
import { LiquidityPositionManager } from './manager'
import { PoolFactory } from './factory'
import { LiquidityPool } from './pool'
import {
  getCollected,
  getCurrencyAmounts,
  getCurrentAmounts,
  getDeposited,
  getPriceFromSqrtPriceX96,
  getWithdrawn,
  newTokenFromTokenAddress,
  toQuoteCurrencyAmount,
} from './util/uniswap'
import { tickToPrice } from '@uniswap/v3-sdk'
import { Price } from '@uniswap/sdk-core'

export async function getLiquidityPositionStats(
  provider: providers.Provider,
  positionId: BigNumberish
): Promise<LiquidityPositionStats> {
  const manager = new LiquidityPositionManager(provider)
  const position = await manager.getLiquidityPosition(positionId)
  const token0 = await newTokenFromTokenAddress(position.token0, provider)
  const token1 = await newTokenFromTokenAddress(position.token1, provider)

  const lowerTickPrice = tickToPrice(token0, token1, position.tickLower)
  const upperTickPrice = tickToPrice(token0, token1, position.tickUpper)

  const factory = new PoolFactory(provider)
  const poolAddress = await factory.getLiquidityPoolAddress(
    position.token0,
    position.token1,
    position.fee
  )

  const pool = new LiquidityPool(poolAddress, provider)

  const slot0 = await pool.getSlot0()
  const currentPrice = getPriceFromSqrtPriceX96(
    slot0.sqrtPriceX96,
    token0,
    token1
  )

  const current = getCurrentAmounts(
    position.liquidity,
    slot0.sqrtPriceX96,
    position.tickLower,
    position.tickUpper,
    token0,
    token1
  )

  const uncollectedRaw = await manager.getUncollected(positionId)
  const uncollected = getCurrencyAmounts(
    token0,
    uncollectedRaw.amount0,
    token1,
    uncollectedRaw.amount1
  )

  const depositedRaw = await getDeposited(
    provider,
    BigNumber.from(positionId),
    pool
  )
  const deposited = getCurrencyAmounts(
    token0,
    depositedRaw.amount0,
    token1,
    depositedRaw.amount1
  )
  const avgDepositPrice = getPriceFromSqrtPriceX96(
    BigNumber.from(depositedRaw.avgSqrtPriceX96.toFixed(0)),
    token0,
    token1
  )

  const withdrawnRaw = await getWithdrawn(
    provider,
    BigNumber.from(positionId),
    pool
  )
  const withdrawn = getCurrencyAmounts(
    token0,
    withdrawnRaw.amount0,
    token1,
    withdrawnRaw.amount1
  )
  const avgWithdrawnPrice = withdrawnRaw.avgSqrtPriceX96
    ? getPriceFromSqrtPriceX96(
        BigNumber.from(withdrawnRaw.avgSqrtPriceX96.toFixed(0)),
        token0,
        token1
      )
    : undefined

  const collectedRaw = await getCollected(
    provider,
    BigNumber.from(positionId),
    pool,
    position.tickLower,
    position.tickUpper
  )
  const collected = getCurrencyAmounts(
    token0,
    collectedRaw.amount0,
    token1,
    collectedRaw.amount1
  )
  const avgCollectedPrice = collectedRaw.avgSqrtPriceX96
    ? getPriceFromSqrtPriceX96(
        BigNumber.from(collectedRaw.avgSqrtPriceX96.toFixed(0)),
        token0,
        token1
      )
    : undefined

  const totalYield = collected.map((v, i) => v.add(uncollected[i]))
  const avgYieldPrice = (() => {
    if (!avgCollectedPrice) {
      return currentPrice
    }

    const collectedQuoteAmount = toQuoteCurrencyAmount(
      collected,
      avgCollectedPrice
    )
    const uncollectedQuoteAmount = toQuoteCurrencyAmount(
      uncollected,
      currentPrice
    )
    const totalQuoteAmount = collectedQuoteAmount.add(uncollectedQuoteAmount)
    const priceFrac = avgCollectedPrice.asFraction
      .multiply(collectedQuoteAmount)
      .add(currentPrice.asFraction.multiply(uncollectedQuoteAmount))
      .divide(totalQuoteAmount)

    return new Price(
      avgCollectedPrice.baseCurrency,
      avgCollectedPrice.quoteCurrency,
      priceFrac.denominator,
      priceFrac.numerator
    )
  })()
  const durationPositionHeld = (() => {
    const endDate = withdrawnRaw.dateLastWithdrawn || new Date()
    return endDate.getTime() - depositedRaw.dateFirstDeposited.getTime()
  })()
  const yieldPerDay = totalYield.map((v) =>
    v.multiply(86_400_000).divide(durationPositionHeld)
  )

  const apr = yieldPerDay.map(
    (v, i) => v.divide(deposited[i]).multiply(365).asFraction
  )

  return {
    positionId: BigNumber.from(positionId),
    lowerTickPrice,
    upperTickPrice,
    currentPrice,
    uncollected,
    current,
    deposited,
    avgDepositPrice,
    withdrawn,
    avgWithdrawnPrice,
    collected,
    avgCollectedPrice,
    dateOpened: depositedRaw.dateFirstDeposited,
    dateClosed: withdrawnRaw.dateLastWithdrawn,
    totalYield,
    avgYieldPrice,
    durationPositionHeld,
    yieldPerDay,
    apr,
  }
}
