import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/auth/user.decorator';
import { RegisterClientDto } from './dto';
import { ClientService } from './client.service';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerClient(
    @CurrentUser('id') userId: string,
    @Body() clientData: RegisterClientDto,
  ) {
    const client = await this.clientService.registerClient(userId, clientData);
    return { status: 'ok', data: client };
  }

  @Get()
  async getAllClients() {
    const clients = await this.clientService.getAllClients();
    return { status: 'ok', data: clients };
  }

  @Get(':id')
  async getClientById(@Param('id') id: string) {
    const client = await this.clientService.getClientById(id);
    return { status: 'ok', data: client };
  }
}
