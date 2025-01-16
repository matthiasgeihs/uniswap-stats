import { ethers, providers } from 'ethers'
import { RPC_URL } from './config'
import { CachedProvider } from './util/cache'

export function getProvider(): providers.Provider {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const cachedProvider = new CachedProvider(provider)

  // Load cache state from local storage.
  const localStorageCacheKey = 'providerCache'
  const serializedCache = localStorage.getItem(localStorageCacheKey)
  if (serializedCache) {
    cachedProvider.deserializeCache(serializedCache)
  }

  // Save cache to local storage on cache update.
  let storeScheduled = false
  cachedProvider.onCacheUpdate(async () => {
    // Ensure pause between two store operations.
    const minDurationBetweenStores = 1000
    if (!storeScheduled) {
      storeScheduled = true
      setTimeout(() => {
        localStorage.setItem(
          localStorageCacheKey,
          cachedProvider.serializeCache()
        )
        storeScheduled = false
      }, minDurationBetweenStores)
    }
  })

  return cachedProvider
}
