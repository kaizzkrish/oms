import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const MAIL_QUEUE = 'mail';

export interface PasswordResetEmailJob {
  type: 'password-reset';
  to: string;
  firstName: string;
  resetUrl: string;
}

export type MailJob = PasswordResetEmailJob;

@Injectable()
export class MailService {
  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<MailJob>,
  ) {}

  async queuePasswordResetEmail(
    job: Omit<PasswordResetEmailJob, 'type'>,
  ): Promise<void> {
    await this.mailQueue.add('password-reset', {
      type: 'password-reset',
      ...job,
    });
  }
}
