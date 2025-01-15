import { providers } from 'ethers'

export type BlockPredicate = (block: number) => boolean

export async function getActiveBlocks(
  provider: providers.Provider, // TODO replace with cached provider
  account: string,
  predicate?: BlockPredicate,
  fromBlock?: number,
  toBlock?: number
): Promise<number[]> {
  const curBlock = await provider.getBlockNumber()

  function nextPowerOf2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)))
  }

  async function getTransactionCount(
    account: string,
    block: number
  ): Promise<number> {
    if (block > curBlock) {
      return provider.getTransactionCount(account, curBlock)
    }
    return provider.getTransactionCount(account, block)
  }

  toBlock = toBlock ?? nextPowerOf2(curBlock)
  const earliestBlock = fromBlock ?? 0
  const latestBlock = toBlock ?? (await provider.getBlockNumber())
  const startTx = Math.max(1, await getTransactionCount(account, earliestBlock))
  const totalTx = await getTransactionCount(account, latestBlock)
  const activeBlocks: number[] = []

  for (let txIndex = startTx; txIndex <= totalTx; txIndex++) {
    let low = earliestBlock
    let high = latestBlock
    let blockWithTx: number | null = null

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const txCount = await getTransactionCount(account, mid)

      if (txCount >= txIndex) {
        blockWithTx = mid
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    if (blockWithTx !== null) {
      if (!predicate || predicate(blockWithTx)) {
        activeBlocks.push(blockWithTx)
      }
    }
  }

  return activeBlocks
}
