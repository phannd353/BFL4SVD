import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '@/common/decorators/auth/user.decorator';
import { RegisterClientDto } from './dto';
import { ClientService } from './client.service';
import { ApiCreatedSerializedResponse } from '@/common';
import { RATE_LIMIT } from '@/config';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedSerializedResponse()
  @Throttle(RATE_LIMIT.INTERNAL)
  async registerClient(
    @CurrentUser('id') userId: string,
    @Body() clientData: RegisterClientDto,
  ) {
    const client = await this.clientService.registerClient(userId, clientData);
    return { success: true, id: client.id };
  }

  @Get()
  async getAllClients() {
    const clients = await this.clientService.getAllClients();
    return clients;
  }

  @Get(':id')
  async getClientById(@Param('id') id: string) {
    const client = await this.clientService.getClientById(id);
    return client;
  }
}
