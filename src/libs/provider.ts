import { ethers, providers } from 'ethers'
import { RPC_URL } from './config'

export function getProvider(): providers.Provider {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  return provider
}
