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
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<UserEntity> {
    const user = await this.usersService.createUser({
      ...dto,
      createdBy: currentUser.sub,
    });
    return UserEntity.fromPrisma(user);
  }

  @Get()
  @ApiOperation({
    summary: 'List users with pagination, search, filtering, and sorting',
  })
  @ApiPaginatedResponse(UserEntity)
  async findAll(
    @Query() query: QueryUsersDto,
  ): Promise<{ items: UserEntity[]; meta: unknown }> {
    const result = await this.usersService.listUsers(query);
    return {
      items: result.items.map((user) => UserEntity.fromPrisma(user)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    const user = await this.usersService.getUserOrThrow(id);
    return UserEntity.fromPrisma(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<UserEntity> {
    const user = await this.usersService.updateUser(id, dto, currentUser.sub);
    return UserEntity.fromPrisma(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete (deactivate) a user' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.usersService.deleteUser(id, currentUser.sub, currentUser.sub);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<UserEntity> {
    const user = await this.usersService.restoreUser(id, currentUser.sub);
    return UserEntity.fromPrisma(user);
  }
}
