import { ethers } from 'ethers'
import IERC20MetadataABI from '@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json'

export class ERC20 {
  contract: ethers.Contract

  constructor(address: string, provider: ethers.providers.Provider) {
    this.contract = new ethers.Contract(
      address,
      IERC20MetadataABI.abi,
      provider
    )
  }

  async symbol(): Promise<string> {
    return this.contract.symbol()
  }

  async name(): Promise<string> {
    return this.contract.name()
  }

  async decimals(): Promise<number> {
    return this.contract.decimals()
  }
}
