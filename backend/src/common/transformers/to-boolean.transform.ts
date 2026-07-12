import { Transform, type TransformFnParams } from 'class-transformer';

/**
 * Query-string booleans arrive as the strings "true"/"false". Nest's global
 * ValidationPipe (`enableImplicitConversion: true`) coerces them via plain
 * `Boolean(value)` *before* handing off to `@Transform`, which turns the
 * string "false" into `true` (any non-empty string is truthy). Reading the
 * raw field off `obj` instead of the already-mangled `value` sidesteps that.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ obj, key }: TransformFnParams): unknown => {
    const raw = (obj as Record<string, unknown>)[key];
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      if (raw.toLowerCase() === 'true') return true;
      if (raw.toLowerCase() === 'false') return false;
    }
    return raw;
  });
}
