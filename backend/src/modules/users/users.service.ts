import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordService } from '../../common/password/password.service';
import type { User } from '../../generated/prisma/client';
import { UsersRepository } from './users.repository';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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
      createdBy: input.createdBy,
    });
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  recordLogin(id: string): Promise<User> {
    return this.usersRepository.updateLastLoginAt(id);
  }
}
