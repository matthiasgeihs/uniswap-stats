import React, { useEffect, useState } from 'react'
import './App.css'
import { getLiquidityPositionStats } from '../libs/stats'
import { getProvider } from '../libs/provider'
import {
  formatBaseCurrencyPrice,
  formatCurrencyAmounts,
} from '../libs/util/uniswap'
import { LiquidityPositionStats } from '../libs/types'

const App = () => {
  const [positionId, setPositionId] = useState<string>('1628115')
  const [stats, setStats] = useState<LiquidityPositionStats | null>(null)
  const [statsText, setStatsText] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stats === null) {
      setStatsText([])
      return
    }

    setStatsText([
      `positionId: ${stats.positionId.toString()}`,
      `range: ${formatBaseCurrencyPrice(
        stats.lowerTickPrice
      )} ${formatBaseCurrencyPrice(stats.upperTickPrice)}`,
      `deposited: ${formatCurrencyAmounts(
        stats.deposited
      )} (at ${formatBaseCurrencyPrice(stats.avgDepositPrice)})`,
      `withdrawn: ${formatCurrencyAmounts(stats.withdrawn)} (at ${
        stats.avgWithdrawnPrice
          ? formatBaseCurrencyPrice(stats.avgWithdrawnPrice)
          : 'N/A'
      })`,
      `current: ${formatCurrencyAmounts(
        stats.current
      )} (at ${formatBaseCurrencyPrice(stats.currentPrice)})`,
      `yield: ${formatCurrencyAmounts(stats.totalYield)}`,
      `dateRange: ${stats.dateOpened.toLocaleString()} ${
        stats.dateClosed ? stats.dateClosed.toLocaleString() : 'N/A'
      } (${(stats.durationPositionHeld / 86_400_000).toFixed(1)} days)`,
      `yieldPerDay: ${formatCurrencyAmounts(stats.yieldPerDay)}`,
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <input
        type="text"
        onChange={(e) => setPositionId(e.target.value)}
        value={positionId?.toString()}
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
          <div>
            <h3>Liquidity Position Stats</h3>
            {statsText.map((stat, index) => (
              <p key={index}>{stat}</p>
            ))}
          </div>
        ))}
    </div>
  )
}

export default App
