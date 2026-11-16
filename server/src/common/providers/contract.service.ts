import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Wallet } from 'ethers';
import { BaseContract } from 'ethers/contract';
import { JsonRpcProvider } from 'ethers/providers';
import { abi } from '@/artifacts/FLRegistry.sol/FLRegistry.json';
import { ConfigService } from './config.service';

@Injectable()
export class ContractService implements OnModuleInit {
  provider: JsonRpcProvider;
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const rpcUrl = this.configService.get('jsonRpcUrl');
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async onModuleInit() {
    const contractAddress = this.configService.get('FLRegistryAddress');
    if (!contractAddress) {
      throw new Error('FL_REGISTRY_ADDRESS environment variable is not set');
    }

    const contract = new BaseContract(contractAddress, abi, this.provider);
    await Promise.race([
      contract.waitForDeployment(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Contract deployment timeout')),
          10000,
        ),
      ),
    ]);
    this.logger.log(`Connected to FLRegistry contract at ${contractAddress}`);
  }

  async getProvider() {
    return this.provider;
  }

  async getWallet() {
    const privateKey = this.configService.get('blockchainPrivateKey');
    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PRIVATE_KEY is not configured');
    }
    return new Wallet(privateKey, this.provider);
  }

  async getWalletAddress() {
    const wallet = await this.getWallet();
    return wallet.address;
  }

  async getContract() {
    return this.createContract(this.provider);
  }

  async getWriteContract() {
    const wallet = await this.getWallet();
    return this.createContract(wallet);
  }

  async getProviderAndContract() {
    const provider = await this.getProvider();
    const contract = await this.getContract();
    return { provider, contract };
  }

  async getWalletAndContract() {
    const wallet = await this.getWallet();
    const contract = await this.createContract(wallet);
    return { wallet, contract };
  }

  async getProviderAndWriteContract() {
    const provider = await this.getProvider();
    const writeContract = await this.getWriteContract();
    return { provider, writeContract };
  }

  async getWalletAndWriteContract() {
    const wallet = await this.getWallet();
    const writeContract = await this.createContract(wallet);
    return { wallet, writeContract };
  }

  async getProviderAndWallet() {
    const provider = await this.getProvider();
    const wallet = await this.getWallet();
    return { provider, wallet };
  }

  async getFLRegistryContract() {
    return this.createContract(this.provider);
  }

  async getFLRegistryWriteContract() {
    const privateKey = this.configService.get('blockchainPrivateKey');
    if (!privateKey) {
      throw new Error('BLOCKCHAIN_PRIVATE_KEY is not configured');
    }

    return this.createContract(new Wallet(privateKey, this.provider));
  }

  private async createContract(providerOrSigner: JsonRpcProvider | Wallet) {
    const contractAddress = this.configService.get('FLRegistryAddress');
    if (!contractAddress) {
      throw new Error('FL_REGISTRY_ADDRESS environment variable is not set');
    }
    const contract = new BaseContract(contractAddress, abi, providerOrSigner);

    await Promise.race([
      contract.waitForDeployment(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Contract deployment timeout')),
          10000,
        ),
      ),
    ]);
    return contract;
  }
}
