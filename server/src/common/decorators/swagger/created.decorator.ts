import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { OperationMetadataDto, SerializedResponseDto } from '../../dto';

// Source - https://stackoverflow.com/a/75501464
// Posted by Branchverse
// Retrieved 2026-03-17, License - CC BY-SA 4.0
export const ApiCreatedSerializedResponse = () =>
  applyDecorators(
    ApiExtraModels(SerializedResponseDto, OperationMetadataDto),
    ApiCreatedResponse({
      description: `The serialized result of Creation result`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SerializedResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(OperationMetadataDto),
              },
            },
          },
        ],
      },
    }),
  );
