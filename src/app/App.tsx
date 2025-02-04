import React, { useEffect, useState } from 'react'
import './App.css'
import { getLiquidityPositionStats } from '../libs/stats'
import { getProvider } from '../libs/provider'
import {
  formatBaseCurrencyPrice,
  formatCurrencyAmountsWithQuote,
  toQuoteCurrencyAmount,
} from '../libs/util/uniswap'
import { LiquidityPositionStats } from '../libs/types'
import { Fraction, Token } from '@uniswap/sdk-core'
import { getURLParamPositionId } from '../libs/util/url'

const App = () => {
  const [positionId, setPositionId] = useState<string>(
    getURLParamPositionId() || '1628115'
  )
  const [stats, setStats] = useState<LiquidityPositionStats | null>(null)
  const [statsText, setStatsText] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stats === null) {
      setStatsText([])
      return
    }

    const aprFormatted = (() => {
      const apr = stats.yieldPerDay.map((v, i) => {
        return {
          value: v.divide(stats.deposited[i]).multiply(365).asFraction,
          currency: v.currency,
        }
      })

      const yieldPerDayQuoteAmount = toQuoteCurrencyAmount(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )
      const depositedQuoteAmount = toQuoteCurrencyAmount(
        stats.deposited,
        stats.avgDepositPrice
      )
      const aprQuoteAmount = yieldPerDayQuoteAmount
        .divide(depositedQuoteAmount)
        .multiply(365).asFraction
      const fmtApr = (apr: { value: Fraction; currency: Token }) =>
        `${apr.value.multiply(100).toFixed(2)}% ${apr.currency.symbol}`
      return `${apr.map(fmtApr).join(' ')} (= ${fmtApr({
        value: aprQuoteAmount,
        currency: yieldPerDayQuoteAmount.currency,
      })} at ${formatBaseCurrencyPrice(stats.avgYieldPrice)})`
    })()

    setStatsText([
      `positionId: ${stats.positionId.toString()}`,
      `range: ${formatBaseCurrencyPrice(
        stats.lowerTickPrice
      )} ${formatBaseCurrencyPrice(stats.upperTickPrice)}`,
      `price: ${formatBaseCurrencyPrice(stats.currentPrice)}`,
      `deposited: ${formatCurrencyAmountsWithQuote(
        stats.deposited,
        stats.avgDepositPrice
      )}`,
      `withdrawn: ${formatCurrencyAmountsWithQuote(
        stats.withdrawn,
        stats.avgWithdrawnPrice
      )}`,
      `current: ${formatCurrencyAmountsWithQuote(
        stats.current,
        stats.currentPrice
      )}`,
      `yield: ${formatCurrencyAmountsWithQuote(
        stats.totalYield,
        stats.avgYieldPrice
      )}`,
      `dateRange: ${stats.dateOpened.toLocaleString()} ${
        stats.dateClosed ? stats.dateClosed.toLocaleString() : 'N/A'
      } (${(stats.durationPositionHeld / 86_400_000).toFixed(1)} days)`,
      `yieldPerDay: ${formatCurrencyAmountsWithQuote(
        stats.yieldPerDay,
        stats.avgYieldPrice
      )}`,
      `apr: ${aprFormatted}`,
    ])
  }, [stats])

  const handleGetStatsClick = async () => {
    if (!positionId) {
      alert('Please enter a Liquidity Position ID')
      return
    }

    setLoading(true)
    try {
      const provider = getProvider()
      const stats = await getLiquidityPositionStats(provider, positionId)
      setStats(stats)
    } catch (error) {
      alert(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <h1>UniswapV3 Stats Viewer (Base)</h1>
      <input
        type="text"
        onChange={(e) => setPositionId(e.target.value)}
        value={positionId}
        placeholder="Liquidity Position ID"
        style={{ textAlign: 'center' }}
      />
      <button onClick={handleGetStatsClick}>
        Get Liquidity Position Stats
      </button>

      {(loading && (
        <div className="loader" style={{ margin: '20px 0' }}></div>
      )) ||
        (stats && (
          <div style={{ marginTop: '20px' }}>
            {/* <h3>Liquidity Position Stats</h3> */}
            <table style={{ textAlign: 'left' }}>
              <tbody>
                {statsText.map((stat, index) => (
                  <tr key={index}>
                    <td>{stat.split(': ')[0]}</td>
                    <td>{stat.split(': ')[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}

export default App
