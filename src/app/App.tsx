import React, { useEffect, useState } from 'react'
import './App.css'
import { getLiquidityPositionStats } from '../libs/stats'
import { getProvider } from '../libs/provider'
import { formatBaseCurrencyPrice, formatCurrencyAmounts } from '../libs/util'
import { LiquidityPositionStats } from '../libs/types'

const App = () => {
  const [positionId, setPositionId] = useState<number | null>(1628115)
  const [stats, setStats] = useState<LiquidityPositionStats | null>(null)
  const [statsText, setStatsText] = useState<string[]>([])

  useEffect(() => {
    if (stats === null) {
      setStatsText([])
      return
    }

    setStatsText([
      `lowerTickPrice: ${formatBaseCurrencyPrice(stats.lowerTickPrice)}`,
      `upperTickPrice: ${formatBaseCurrencyPrice(stats.upperTickPrice)}`,
      `currentPrice: ${formatBaseCurrencyPrice(stats.currentPrice)}`,
      `uncollected: ${formatCurrencyAmounts(stats.uncollected)}`,
      `current: ${formatCurrencyAmounts(stats.current)}`,
    ])
  }, [stats])

  const handleGetStatsClick = async () => {
    if (positionId === null) {
      return
    }

    const provider = getProvider()
    const stats = await getLiquidityPositionStats(provider, positionId)
    setStats(stats)
  }

  return (
    <div className="App">
      <input
        type="text"
        onChange={(e) => setPositionId(parseInt(e.target.value))}
        value={positionId?.toString()}
        placeholder="Liquidity Position ID"
      />
      <button onClick={handleGetStatsClick}>
        Get Liquidity Position Stats
      </button>
      <h3>Liquidity Position Stats</h3>
      Position Id: {positionId}
      <div>
        {statsText.map((stat, index) => (
          <p key={index}>{stat}</p>
        ))}
      </div>
    </div>
  )
}

export default App
