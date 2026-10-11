import { Attributes } from '@opentelemetry/api';

export class AttributesBuilder {
  protected attributes: Attributes = {};

  setAttribute(key: string, value: string | number | boolean): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Attributes): this {
    Object.assign(this.attributes, attributes);
    return this;
  }

  build(): Attributes {
    return this.attributes;
  }
}
