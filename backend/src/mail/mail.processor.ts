import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { AppConfig } from '../config/configuration';
import { MAIL_QUEUE, type MailJob } from './mail.service';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    super();
    const smtp = configService.get('smtp', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
    this.fromName = smtp.fromName;
    this.fromEmail = smtp.fromEmail;
  }

  async process(job: Job<MailJob>): Promise<void> {
    switch (job.data.type) {
      case 'password-reset':
        await this.sendPasswordResetEmail(job.data);
        break;
    }
  }

  private async sendPasswordResetEmail(data: {
    to: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: data.to,
      subject: 'Reset your password',
      html: `
        <p>Hi ${data.firstName},</p>
        <p>We received a request to reset your password. This link expires in 1 hour.</p>
        <p><a href="${data.resetUrl}">Reset your password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    });
    this.logger.log(`Password reset email sent to ${data.to}`);
  }
}
