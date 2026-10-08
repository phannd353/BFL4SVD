import { Injectable } from '@nestjs/common';
import { BaseContract } from 'ethers/contract';
import { JsonRpcProvider } from 'ethers/providers';
import { abi } from '@/artifacts/FLRegistry.sol/FLRegistry.json';
import { ConfigService } from './config.service';

@Injectable()
class ContractService {
  provider: JsonRpcProvider;
  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get('jsonRpcUrl');
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async getFLRegistryContract() {
    const contractAddress = this.configService.get('FLRegistryAddress');
    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS environment variable is not set');
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
    return contract;
  }
}

export default ContractService;
