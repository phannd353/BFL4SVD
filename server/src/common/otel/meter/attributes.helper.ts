import { Attributes } from '@opentelemetry/api';
import { HttpAttributes, RpcAttributes } from './attributes.interface';
import { AttributesBuilder } from './attributes.builder';

export function createHttpAttributes(attributes: HttpAttributes): Attributes {
  const builder = new AttributesBuilder()
    .setAttribute('http.method', attributes.method)
    .setAttribute('http.route', attributes.route)
    .setAttribute('http.handler', attributes.handler);

  if (attributes.statusCode) {
    const statusClass = `${Math.floor(attributes.statusCode / 100)}xx`;
    builder.setAttribute('status_class', statusClass);
  }

  return builder.build();
}

export function createRpcAttributes(attributes: RpcAttributes): Attributes {
  const builder = new AttributesBuilder()
    .setAttribute('rpc.service', attributes.service)
    .setAttribute('rpc.method', attributes.method);

  if (attributes.statusCode) {
    const statusClass = `${Math.floor(attributes.statusCode / 100)}xx`;
    builder.setAttribute('status_class', statusClass);
  }

  return builder.build();
}
