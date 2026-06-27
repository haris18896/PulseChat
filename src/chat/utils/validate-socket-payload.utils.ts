import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { socketError } from './socket-erro.utils';

/**
 * Validates a socket payload against a DTO class.
 * @param dtoClass - The DTO class to validate against.
 * @param payload - The socket payload to validate.
 * @returns The validated DTO instance.
 */
export async function validateSocketPayload<T extends object>(
  dtoClass: new () => T,
  payload: unknown,
): Promise<T> {
  // Convert raw socket payload into DTO class instance.
  const dto = plainToInstance(dtoClass, payload);

  // Runs class-validator decorators like: @IsString(), @IsNotEmpty(), @IsUUID('4'), etc.
  const errors = await validate(dto, {
    whitelist: true, // Remove extra properties that are not in the DTO.
    forbidNonWhitelisted: true, // Throw an error if there are extra properties that are not in the DTO.
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      error.constraints ? Object.values(error.constraints) : [],
    );

    // Return a socket error with the validation messages.
    throw socketError(
      messages.length > 0 ? messages.join(', ') : 'Validation failed',
      'VALIDATION_ERROR',
    );
  }

  return dto;
}
