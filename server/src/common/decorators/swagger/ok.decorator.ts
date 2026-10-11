import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
  OperationMetadataDto,
  PaginationMetadataDto,
  SerializedResponseDto,
} from '../../dto';

// Source - https://stackoverflow.com/a/75501464
// Posted by Branchverse
// Retrieved 2026-03-17, License - CC BY-SA 4.0
export const ApiOkSerializedResponse = <GenericType extends Type<unknown>>(
  data: GenericType,
) =>
  applyDecorators(
    ApiExtraModels(SerializedResponseDto, data),
    ApiOkResponse({
      description: `The serialized result of ${data.name}`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SerializedResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(data),
              },
            },
          },
        ],
      },
    }),
  );

export const ApiOkSerializedPaginatedResponse = <
  GenericType extends Type<unknown>,
>(
  data: GenericType,
) =>
  applyDecorators(
    ApiExtraModels(SerializedResponseDto, data, PaginationMetadataDto),
    ApiOkResponse({
      description: `The serialized paginated result of ${data.name}`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SerializedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(data) },
              },
              pagination: {
                $ref: getSchemaPath(PaginationMetadataDto),
              },
            },
          },
        ],
      },
    }),
  );

export const ApiOkSerializedOperationResponse = () =>
  ApiOkSerializedResponse(OperationMetadataDto);
