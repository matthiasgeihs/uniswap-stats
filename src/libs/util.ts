import { BigNumber, BigNumberish, providers } from 'ethers'
import { CurrencyAmount, Fraction, Price, Token } from '@uniswap/sdk-core'
import { ERC20 } from './token'
import { TickMath } from '@uniswap/v3-sdk'
import JSBI from 'jsbi'

export function getPriceFromSqrtPriceX96(
  sqrtPriceX96: BigNumber,
  baseToken: Token,
  quoteToken: Token
): Price<Token, Token> {
  const ratioX192 = sqrtPriceX96.pow(2).toString()
  const Q192 = BigNumber.from(2).pow(192).toString()
  return baseToken.sortsBefore(quoteToken)
    ? new Price(baseToken, quoteToken, Q192, ratioX192)
    : new Price(baseToken, quoteToken, ratioX192, Q192)
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
  // if (curPrice.lessThan(lowerTickPrice)) {
  //   // Out of range, all in token0
  //   // amount0 = liquidity * (price_upper - price_lower) / (price_lower * price_upper)
  //   // amount1 = 0
  //   const num = upperTickPrice.subtract(lowerTickPrice)
  //   const denom = lowerTickPrice.multiply(upperTickPrice)
  //   const frac = num.divide(denom).multiply(liquidity.toString())
  //   const amount0 = CurrencyAmount.fromFractionalAmount(
  //     curPrice.baseCurrency,
  //     frac.numerator,
  //     frac.denominator
  //   )
  //   const amount1 = CurrencyAmount.fromRawAmount(curPrice.quoteCurrency, 0)
  //   return [amount0, amount1]
  // } else if (curPrice.greaterThan(upperTickPrice)) {
  //   // Out of range, all in token1
  //   // amount0 = 0
  //   // amount1 = liquidity * (price_upper - price_lower)
  //   const amount0 = CurrencyAmount.fromRawAmount(curPrice.baseCurrency, 0)
  //   const num = upperTickPrice.subtract(lowerTickPrice)
  //   const frac = num.multiply(liquidity.toString())
  //   const amount1 = CurrencyAmount.fromFractionalAmount(
  //     curPrice.quoteCurrency,
  //     frac.numerator,
  //     frac.denominator
  //   )
  //   return [amount0, amount1]
  // }

  const liquidityJSBI = JSBI.BigInt(liquidity.toString())
  const curPriceSqrtX96JSBI = JSBI.BigInt(curPriceSqrtX96.toString())
  const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

  const lowerTickSqrtPriceX96 = TickMath.getSqrtRatioAtTick(lowerTick)
  const upperTickSqrtPriceX96 = TickMath.getSqrtRatioAtTick(upperTick)

  // If out of range, throw error.
  if (
    JSBI.lessThan(curPriceSqrtX96JSBI, lowerTickSqrtPriceX96) ||
    JSBI.greaterThan(curPriceSqrtX96JSBI, upperTickSqrtPriceX96)
  ) {
    // TODO implement
    throw new Error('Current price is out of range')
  }

  // In range, split liquidity
  // amount0 = liquidity * (sqrt_price_upper - sqrt_price_current) / (sqrt_price_current * sqrt_price_upper)
  // amount1 = liquidity * (sqrt_price_current - sqrt_price_lower)
  const amount0Frac = (() => {
    const num = JSBI.subtract(upperTickSqrtPriceX96, curPriceSqrtX96JSBI)
    const denom = JSBI.multiply(curPriceSqrtX96JSBI, upperTickSqrtPriceX96)
    const frac = new Fraction(num, denom).multiply(Q96)
    return frac.multiply(liquidityJSBI)
  })()

  const amount1Frac = (() => {
    const num = JSBI.subtract(curPriceSqrtX96JSBI, lowerTickSqrtPriceX96)
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
