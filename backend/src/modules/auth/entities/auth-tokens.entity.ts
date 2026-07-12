import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';

export class AuthTokensEntity {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresIn: string;

  @ApiProperty({ type: UserEntity })
  user: UserEntity;

  constructor(props: AuthTokensEntity) {
    this.accessToken = props.accessToken;
    this.expiresIn = props.expiresIn;
    this.user = props.user;
  }
}
