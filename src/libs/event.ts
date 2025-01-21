import { BigNumber, providers, EventFilter, ethers } from 'ethers'
import { HYPER_RPC_URL } from './config'
import { LiquidityPositionManager } from './manager'
import { getActiveBlocks } from './util/chain'

export async function getEvents<T>(
  provider: providers.Provider,
  tokenId: BigNumber,
  eventFilter: EventFilter,
  logToEvent: (log: providers.Log) => T,
  fromBlock?: providers.BlockTag,
  toBlock?: providers.BlockTag
): Promise<T[]> {
  // If a block range is not provided, we may not catch all events because
  // standard node providers typically do not return events from more than a few
  // thousands blocks in the past.
  if (fromBlock === undefined && toBlock === undefined) {
    if (HYPER_RPC_URL) {
      // If we have a Hyper RPC provider, we use that.
      fromBlock = 0
      toBlock = 'latest'
      provider = new ethers.providers.JsonRpcProvider(HYPER_RPC_URL)
    } else {
      // Otherwise, we run the following procedure to find all events with
      // respect to a given account. We first retrieve all blocks where the
      // account was active. Then we search these blocks for the event.
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
  }

  // Fetch logs.
  const logs = await provider.getLogs({ ...eventFilter, fromBlock, toBlock })

  // Parse events.
  const events = logs.map((log) => logToEvent(log))
  return events
}
