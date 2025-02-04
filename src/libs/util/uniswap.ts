import { BigNumber, BigNumberish, providers } from 'ethers'
import { CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core'
import { ERC20 } from '../token'
import { maxLiquidityForAmounts, TickMath } from '@uniswap/v3-sdk'
import JSBI from 'jsbi'
import { getEvents } from '../event'
import { LiquidityPositionManager } from '../manager'
import { LiquidityPool } from '../pool'

export function getPriceFromSqrtPriceX96(
  sqrtPriceX96: BigNumber,
  baseToken: Token,
  quoteToken: Token
): Price<Token, Token> {
  const ratioX192 = sqrtPriceX96.pow(2).toString()
  const Q192 = BigNumber.from(2).pow(192).toString()
  return new Price(baseToken, quoteToken, Q192, ratioX192)
}

export async function newTokenFromTokenAddress(
  tokenAddress: string,
  provider: providers.Provider
): Promise<Token> {
  const network = await provider.getNetwork()
  const erc20 = new ERC20(tokenAddress, provider)
  return new Token(
    network.chainId,
    tokenAddress,
    await erc20.decimals(),
    await erc20.symbol(),
    await erc20.name()
  )
}

export function formatBaseCurrencyPrice(price: Price<Token, Token>): string {
  const base = CurrencyAmount.fromRawAmount(
    price.baseCurrency,
    BigNumber.from(10).pow(price.baseCurrency.decimals).toString()
  )
  const quote = price.quote(base)
  return `${quote.toSignificant()} ${quote.currency.symbol}/${
    base.currency.symbol
  }`
}

export function formatCurrencyAmounts(
  amounts: CurrencyAmount<Token>[]
): string {
  return amounts
    .map((amount) => `${amount.toSignificant()} ${amount.currency.symbol}`)
    .join(' ')
}

export function formatCurrencyAmountsWithQuote(
  amounts: CurrencyAmount<Token>[],
  price: Price<Token, Token> | undefined
): string {
  const quoteInfo = (() => {
    if (!price) {
      return 'N/A'
    }
    const quoteAmount = toQuoteCurrencyAmount(amounts, price)
    return `= ${formatCurrencyAmounts([
      quoteAmount,
    ])} at ${formatBaseCurrencyPrice(price)}`
  })()

  return `${formatCurrencyAmounts(amounts)} (${quoteInfo})`
}

export function toQuoteCurrencyAmount(
  amounts: CurrencyAmount<Token>[],
  price: Price<Token, Token>
): CurrencyAmount<Token> {
  const quoteCurrencyIndex = amounts.findIndex((amount) =>
    amount.currency.equals(price.quoteCurrency)
  )
  if (quoteCurrencyIndex === -1) {
    throw new Error('Could not find quote currency in deposited amounts')
  }
  return amounts.reduce(
    (acc, amount, i) =>
      i == quoteCurrencyIndex ? acc.add(amount) : acc.add(price.quote(amount)),
    CurrencyAmount.fromRawAmount(price.quoteCurrency, 0)
  )
}

export function getCurrencyAmounts(
  token0: Token,
  amount0: BigNumberish,
  token1: Token,
  amount1: BigNumberish
): CurrencyAmount<Token>[] {
  return [
    CurrencyAmount.fromRawAmount(token0, amount0.toString()),
    CurrencyAmount.fromRawAmount(token1, amount1.toString()),
  ]
}

export function getCurrentAmounts(
  liquidity: BigNumber,
  curPriceSqrtX96: BigNumber,
  lowerTick: number,
  upperTick: number,
  token0: Token,
  token1: Token
): CurrencyAmount<Token>[] {
  const liquidityJSBI = JSBI.BigInt(liquidity.toString())
  const curPriceSqrtX96JSBI = JSBI.BigInt(curPriceSqrtX96.toString())
  const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

  const lowerTickSqrtPriceX96 = TickMath.getSqrtRatioAtTick(lowerTick)
  const upperTickSqrtPriceX96 = TickMath.getSqrtRatioAtTick(upperTick)

  const curPriceBoundedSqrtX96 = (() => {
    if (JSBI.lessThan(curPriceSqrtX96JSBI, lowerTickSqrtPriceX96)) {
      return lowerTickSqrtPriceX96
    } else if (JSBI.greaterThan(curPriceSqrtX96JSBI, upperTickSqrtPriceX96)) {
      return upperTickSqrtPriceX96
    }
    return curPriceSqrtX96JSBI
  })()

  // amount0 = liquidity * (sqrt_price_upper - sqrt_price_current) / (sqrt_price_current * sqrt_price_upper)
  const amount0Frac = (() => {
    const num = JSBI.subtract(upperTickSqrtPriceX96, curPriceBoundedSqrtX96)
    const denom = JSBI.multiply(curPriceBoundedSqrtX96, upperTickSqrtPriceX96)
    const frac = new Fraction(num, denom).multiply(Q96)
    return frac.multiply(liquidityJSBI)
  })()

  // amount1 = liquidity * (sqrt_price_current - sqrt_price_lower)
  const amount1Frac = (() => {
    const num = JSBI.subtract(curPriceBoundedSqrtX96, lowerTickSqrtPriceX96)
    const denom = Q96
    const frac = new Fraction(num, denom)
    return frac.multiply(liquidityJSBI)
  })()

  const amount0 = CurrencyAmount.fromFractionalAmount(
    token0,
    amount0Frac.numerator,
    amount0Frac.denominator
  )
  const amount1 = CurrencyAmount.fromFractionalAmount(
    token1,
    amount1Frac.numerator,
    amount1Frac.denominator
  )

  return [amount0, amount1]
}

async function getIncreaseLiquidityEvents(
  provider: providers.Provider,
  tokenId: BigNumber
) {
  const positionManager = new LiquidityPositionManager(provider)
  const eventFilter =
    positionManager.contract.filters.IncreaseLiquidity(tokenId)

  const logToEvent = (log: providers.Log) => {
    const parsed = positionManager.contract.interface.parseLog(log)
    return {
      blockNumber: log.blockNumber,
      tokenId: parsed.args.tokenId as BigNumber,
      liquidity: parsed.args.liquidity as BigNumber,
      amount0: parsed.args.amount0 as BigNumber,
      amount1: parsed.args.amount1 as BigNumber,
    }
  }

  const events = await getEvents(provider, tokenId, eventFilter, logToEvent)
  return events
}

export async function getDeposited(
  provider: providers.Provider,
  positionId: BigNumber,
  pool: LiquidityPool
) {
  const events = await getIncreaseLiquidityEvents(provider, positionId)

  if (events.length == 0) {
    throw new Error('No deposits found')
  }

  let totalAmount0 = BigNumber.from(0)
  let totalAmount1 = BigNumber.from(0)
  let totalLiquidity = BigNumber.from(0)
  let totalWeightedPrice = BigNumber.from(0)
  for (const event of events) {
    totalAmount0 = totalAmount0.add(event.amount0)
    totalAmount1 = totalAmount1.add(event.amount1)

    const sqrtPriceX96 = (await pool.getSlot0(event.blockNumber)).sqrtPriceX96
    totalLiquidity = totalLiquidity.add(event.liquidity)
    totalWeightedPrice = totalWeightedPrice.add(
      sqrtPriceX96.mul(event.liquidity)
    )
  }

  const avgPrice = new Fraction(
    JSBI.BigInt(totalWeightedPrice.toString()),
    JSBI.BigInt(totalLiquidity.toString())
  )

  const dateFirstEvent = await (async () => {
    const firstBlock = await provider.getBlock(events[0].blockNumber)
    return new Date(firstBlock.timestamp * 1000)
  })()

  return {
    amount0: totalAmount0,
    amount1: totalAmount1,
    avgSqrtPriceX96: avgPrice,
    dateFirstDeposited: dateFirstEvent,
  }
}

async function getDecreaseLiquidityEvents(
  provider: providers.Provider,
  tokenId: BigNumber
) {
  const positionManager = new LiquidityPositionManager(provider)
  const eventFilter =
    positionManager.contract.filters.DecreaseLiquidity(tokenId)

  const logToEvent = (log: providers.Log) => {
    const parsed = positionManager.contract.interface.parseLog(log)
    return {
      blockNumber: log.blockNumber,
      tokenId: parsed.args.tokenId as BigNumber,
      liquidity: parsed.args.liquidity as BigNumber,
      amount0: parsed.args.amount0 as BigNumber,
      amount1: parsed.args.amount1 as BigNumber,
    }
  }

  const events = await getEvents(provider, tokenId, eventFilter, logToEvent)
  return events
}

export async function getWithdrawn(
  provider: providers.Provider,
  positionId: BigNumber,
  pool: LiquidityPool
) {
  const events = await getDecreaseLiquidityEvents(provider, positionId)

  let totalAmount0 = BigNumber.from(0)
  let totalAmount1 = BigNumber.from(0)
  let totalLiquidity = BigNumber.from(0)
  let totalWeightedPrice = BigNumber.from(0)
  for (const event of events) {
    totalAmount0 = totalAmount0.add(event.amount0)
    totalAmount1 = totalAmount1.add(event.amount1)

    const sqrtPriceX96 = (await pool.getSlot0(event.blockNumber)).sqrtPriceX96
    totalLiquidity = totalLiquidity.add(event.liquidity)
    totalWeightedPrice = totalWeightedPrice.add(
      sqrtPriceX96.mul(event.liquidity)
    )
  }

  const avgPrice = totalLiquidity.isZero()
    ? undefined
    : new Fraction(
        JSBI.BigInt(totalWeightedPrice.toString()),
        JSBI.BigInt(totalLiquidity.toString())
      )

  const dateLastEvent = await (async () => {
    if (events.length == 0) {
      return undefined
    }

    const lastBlock = await provider.getBlock(
      events[events.length - 1].blockNumber
    )
    return new Date(lastBlock.timestamp * 1000)
  })()

  return {
    amount0: totalAmount0,
    amount1: totalAmount1,
    avgSqrtPriceX96: avgPrice,
    dateLastWithdrawn: dateLastEvent,
  }
}

async function getCollectEvents(
  provider: providers.Provider,
  tokenId: BigNumber
) {
  const positionManager = new LiquidityPositionManager(provider)
  const eventFilter = positionManager.contract.filters.Collect(tokenId)

  const logToEvent = (log: providers.Log) => {
    const parsed = positionManager.contract.interface.parseLog(log)
    return {
      blockNumber: log.blockNumber,
      tokenId: parsed.args.tokenId as BigNumber,
      recipient: parsed.args.recipient as string,
      amount0: parsed.args.amount0 as BigNumber,
      amount1: parsed.args.amount1 as BigNumber,
    }
  }

  const events = await getEvents(provider, tokenId, eventFilter, logToEvent)
  return events
}

export async function getCollected(
  provider: providers.Provider,
  positionId: BigNumber,
  pool: LiquidityPool,
  tickLower: number,
  tickUpper: number
) {
  const sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower)
  const sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper)

  const [collect_events, decrease_events] = await Promise.all([
    getCollectEvents(provider, positionId),
    getDecreaseLiquidityEvents(provider, positionId),
  ])

  let totalAmount0 = BigNumber.from(0)
  let totalAmount1 = BigNumber.from(0)
  let totalLiquidity = BigNumber.from(0)
  let totalWeightedPrice = BigNumber.from(0)
  for (const event of collect_events) {
    totalAmount0 = totalAmount0.add(event.amount0)
    totalAmount1 = totalAmount1.add(event.amount1)

    const sqrtPriceX96 = (await pool.getSlot0(event.blockNumber)).sqrtPriceX96

    const liquidityJSBI = maxLiquidityForAmounts(
      JSBI.BigInt(sqrtPriceX96.toString()),
      sqrtRatioAX96,
      sqrtRatioBX96,
      JSBI.BigInt(event.amount0),
      JSBI.BigInt(event.amount1),
      true
    )
    const liquidity = BigNumber.from(liquidityJSBI.toString())

    totalLiquidity = totalLiquidity.add(liquidity)
    totalWeightedPrice = totalWeightedPrice.add(sqrtPriceX96.mul(liquidity))
  }

  for (const event of decrease_events) {
    totalAmount0 = totalAmount0.sub(event.amount0)
    totalAmount1 = totalAmount1.sub(event.amount1)

    const sqrtPriceX96 = (await pool.getSlot0(event.blockNumber)).sqrtPriceX96
    totalLiquidity = totalLiquidity.sub(event.liquidity)
    totalWeightedPrice = totalWeightedPrice.sub(
      sqrtPriceX96.mul(event.liquidity)
    )
  }

  const avgPrice = totalLiquidity.isZero()
    ? undefined
    : new Fraction(
        JSBI.BigInt(totalWeightedPrice.toString()),
        JSBI.BigInt(totalLiquidity.toString())
      )
  return {
    amount0: totalAmount0,
    amount1: totalAmount1,
    avgSqrtPriceX96: avgPrice,
  }
}
