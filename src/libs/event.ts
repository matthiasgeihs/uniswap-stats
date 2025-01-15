import { BigNumber, providers, EventFilter } from 'ethers'
import { LiquidityPositionManager } from './manager'
import { getActiveBlocks } from './util/chain'

export async function getEvents<T>(
  provider: providers.Provider, // TODO replace with cached provider
  tokenId: BigNumber,
  eventFilter: EventFilter,
  logToEvent: (log: providers.Log) => T,
  fromBlock?: number,
  toBlock?: number
): Promise<T[]> {
  // If a block range is not provided, we run the following procedure to find
  // all events with respect to a given account. We first retrieve all blocks
  // where the account was active. Then we search these blocks for the event.
  if (fromBlock === undefined && toBlock === undefined) {
    const manager = new LiquidityPositionManager(provider)
    const account = await manager.ownerOf(tokenId)
    const activeBlocks = await getActiveBlocks(provider, account)

    let events: T[] = []
    for (const block of activeBlocks) {
      const blockEvents = await getEvents(
        provider,
        tokenId,
        eventFilter,
        logToEvent,
        block,
        block
      )
      events = events.concat(blockEvents)
    }
    return events
  }

  // Fetch logs.
  const logs = await provider.getLogs({ ...eventFilter, fromBlock, toBlock })

  // Parse events.
  const events = logs.map((log) => logToEvent(log))
  return events
}
