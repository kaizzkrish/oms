import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Marks a route as returning its own response (e.g. a binary file stream)
 * instead of JSON. Checked by `TransformInterceptor`, which otherwise wraps
 * every response in the standard `{ success, statusCode, ... , data }`
 * envelope.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
