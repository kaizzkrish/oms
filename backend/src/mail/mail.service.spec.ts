import type { Queue } from 'bullmq';
import { MailService, type MailJob } from './mail.service';

describe('MailService', () => {
  it('enqueues a password-reset job with the correct payload', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const queue = { add } as unknown as Queue<MailJob>;
    const service = new MailService(queue);

    await service.queuePasswordResetEmail({
      to: 'jane@example.com',
      firstName: 'Jane',
      resetUrl: 'https://oms.local/reset?token=abc',
    });

    expect(add).toHaveBeenCalledWith('password-reset', {
      type: 'password-reset',
      to: 'jane@example.com',
      firstName: 'Jane',
      resetUrl: 'https://oms.local/reset?token=abc',
    });
  });
});
