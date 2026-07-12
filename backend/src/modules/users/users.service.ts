import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PasswordService } from '../../common/password/password.service';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { User } from '../../generated/prisma/client';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  createdBy?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getUserOrThrow(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async listUsers(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.usersRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    return this.usersRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive,
      createdBy: input.createdBy,
    });
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<User> {
    await this.getUserOrThrow(id);

    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    return this.usersRepository.update(id, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: dto.isActive,
      updatedBy,
    });
  }

  async deleteUser(
    id: string,
    currentUserId: string,
    deletedBy?: string,
  ): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    await this.getUserOrThrow(id);
    await this.usersRepository.softDelete(id, deletedBy);
  }

  async restoreUser(id: string, updatedBy?: string): Promise<User> {
    await this.getUserOrThrow(id);
    return this.usersRepository.restore(id, updatedBy);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  recordLogin(id: string): Promise<User> {
    return this.usersRepository.updateLastLoginAt(id);
  }
}
