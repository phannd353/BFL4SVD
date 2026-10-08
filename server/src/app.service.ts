import { Injectable } from '@nestjs/common';
import { JsonRpcProvider } from 'ethers';
import ContractService from './common/services/contract.service';

@Injectable()
export class AppService {
  constructor(private readonly contractService: ContractService) {}

  async getHello() {
    const flRegistry = await this.contractService.getFLRegistryContract();
    return 'Hello World!' + (await flRegistry.getFunction('getModelUpdates')());
  }
}
