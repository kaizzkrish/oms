import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientEntity } from './entities/client.entity';
import { ClientsService } from './clients.service';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions('Clients.Create')
  @ApiOperation({ summary: 'Create a new client' })
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ClientEntity> {
    const client = await this.clientsService.createClient(dto, currentUser.sub);
    return ClientEntity.fromPrisma(client);
  }

  @Get()
  @RequirePermissions('Clients.View')
  @ApiOperation({
    summary:
      'List clients with pagination, search, filtering (by organization/account manager), and sorting',
  })
  @ApiPaginatedResponse(ClientEntity)
  async findAll(
    @Query() query: QueryClientsDto,
  ): Promise<{ items: ClientEntity[]; meta: unknown }> {
    const result = await this.clientsService.listClients(query);
    return {
      items: result.items.map((client) => ClientEntity.fromPrisma(client)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Clients.View')
  @ApiOperation({ summary: 'Get a client by id' })
  async findOne(@Param('id') id: string): Promise<ClientEntity> {
    const client = await this.clientsService.getClientOrThrow(id);
    return ClientEntity.fromPrisma(client);
  }

  @Patch(':id')
  @RequirePermissions('Clients.Update')
  @ApiOperation({ summary: 'Update a client' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ClientEntity> {
    const client = await this.clientsService.updateClient(
      id,
      dto,
      currentUser.sub,
    );
    return ClientEntity.fromPrisma(client);
  }

  @Delete(':id')
  @RequirePermissions('Clients.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a client' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.clientsService.deleteClient(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Clients.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted client' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ClientEntity> {
    const client = await this.clientsService.restoreClient(id, currentUser.sub);
    return ClientEntity.fromPrisma(client);
  }
}
