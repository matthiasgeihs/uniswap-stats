import { providers } from 'ethers'
import {
  Provider,
  Block,
  BlockTag,
  TransactionRequest,
  TransactionResponse,
  BlockWithTransactions,
} from '@ethersproject/abstract-provider'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { Deferrable } from '@ethersproject/properties'

export class CachedProvider extends providers.Provider {
  private cache: Map<string, unknown>
  private provider: Provider
  private cacheUpdateCallback?: () => Promise<void>

  constructor(provider: Provider) {
    super()
    this.provider = provider
    this.cache = new Map()
  }

  // Callbacks

  onCacheUpdate(callback: () => Promise<void>) {
    this.cacheUpdateCallback = callback
  }

  // Cache

  private createCacheKey(method: string, params: unknown[]): string {
    return `${method}:${JSON.stringify(params)}`
  }

  private async getCached<T>(
    method: string,
    params: unknown[],
    fetch: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.createCacheKey(method, params)

    if (this.cache.has(cacheKey)) {
      console.log('Cache hit:', cacheKey)
      return this.cache.get(cacheKey) as T
    }

    const result = await fetch()
    this.cache.set(cacheKey, result)
    if (this.cacheUpdateCallback) {
      await this.cacheUpdateCallback()
    }
    return result
  }

  serializeCache(): string {
    return JSON.stringify(Array.from(this.cache.entries()))
  }

  deserializeCache(serializedCache: string): void {
    const entries = JSON.parse(serializedCache)
    this.cache = new Map(entries)
  }

  // Network

  async getNetwork(): Promise<providers.Network> {
    return this.provider.getNetwork()
  }

  // Latest State

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber()
  }

  async getGasPrice(): Promise<BigNumber> {
    return this.provider.getGasPrice()
  }

  async getFeeData(): Promise<providers.FeeData> {
    return this.provider.getFeeData()
  }

  // Account

  async getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<BigNumber> {
    const address = await addressOrName
    const block = await blockTag
    if (block) {
      return this.getCached('getBalance', [address, block], () =>
        this.provider.getBalance(address, block)
      )
    }
    return this.provider.getBalance(address, block)
  }

  async getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> {
    const address = await addressOrName
    const block = await blockTag
    if (block) {
      return this.getCached('getTransactionCount', [address, block], () =>
        this.provider.getTransactionCount(address, block)
      )
    }
    return this.provider.getTransactionCount(address, block)
  }

  async getCode(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    const address = await addressOrName
    const block = await blockTag
    if (block) {
      return this.getCached('getCode', [address, block], () =>
        this.provider.getCode(address, block)
      )
    }
    return this.provider.getCode(address, block)
  }

  async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    const address = await addressOrName
    const pos = await position
    const block = await blockTag
    if (block) {
      return this.getCached('getStorageAt', [address, pos, block], () =>
        this.provider.getStorageAt(address, pos, block)
      )
    }
    return this.provider.getStorageAt(address, pos, block)
  }

  // Execution

  async sendTransaction(
    signedTransaction: string | Promise<string>
  ): Promise<TransactionResponse> {
    // Don't cache transactions as they should always be sent to network
    return this.provider.sendTransaction(await signedTransaction)
  }

  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    const block = await blockTag
    if (block) {
      return this.getCached('call', [transaction, block], () =>
        this.provider.call(transaction, block)
      )
    }
    return this.provider.call(transaction, block)
  }

  async estimateGas(
    transaction: Deferrable<TransactionRequest>
  ): Promise<BigNumber> {
    return this.provider.estimateGas(transaction)
  }

  // Queries

  async getBlock(
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<Block> {
    const block = await blockHashOrBlockTag
    return this.getCached('getBlock', [block], () =>
      this.provider.getBlock(block)
    )
  }

  async getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<BlockWithTransactions> {
    const block = await blockHashOrBlockTag
    return this.getCached('getBlockWithTransactions', [block], () =>
      this.provider.getBlockWithTransactions(block)
    )
  }

  async getTransaction(transactionHash: string): Promise<TransactionResponse> {
    return this.provider.getTransaction(transactionHash)
  }

  async getTransactionReceipt(
    transactionHash: string
  ): Promise<providers.TransactionReceipt> {
    return this.provider.getTransactionReceipt(transactionHash)
  }

  // Bloom-filter Queries

  async getLogs(filter: providers.Filter): Promise<providers.Log[]> {
    if (!filter.toBlock) {
      return this.provider.getLogs(filter)
    }

    return this.getCached('getLogs', [filter], () =>
      this.provider.getLogs(filter)
    )
  }

  // ENS

  async resolveName(name: string | Promise<string>): Promise<null | string> {
    return this.provider.resolveName(await name)
  }

  async lookupAddress(
    address: string | Promise<string>
  ): Promise<null | string> {
    return this.provider.lookupAddress(await address)
  }

  // Event Emitter

  on(eventName: providers.EventType, listener: providers.Listener): Provider {
    this.provider.on(eventName, listener)
    return this
  }

  once(eventName: providers.EventType, listener: providers.Listener): Provider {
    this.provider.once(eventName, listener)
    return this
  }

  emit(eventName: providers.EventType, ...args: unknown[]): boolean {
    return this.provider.emit(eventName, ...args)
  }

  listenerCount(eventName?: providers.EventType): number {
    return this.provider.listenerCount(eventName)
  }

  listeners(eventName?: providers.EventType): providers.Listener[] {
    return this.provider.listeners(eventName)
  }

  off(eventName: providers.EventType, listener?: providers.Listener): Provider {
    this.provider.off(eventName, listener)
    return this
  }

  removeAllListeners(eventName?: providers.EventType): Provider {
    this.provider.removeAllListeners(eventName)
    return this
  }

  waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<providers.TransactionReceipt> {
    return this.provider.waitForTransaction(
      transactionHash,
      confirmations,
      timeout
    )
  }
}
