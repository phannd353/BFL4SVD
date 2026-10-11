import { Attributes } from '@opentelemetry/api';

class MetricsAttributeBuilder {
  private attributes: Attributes = {};

  addAttribute(key: string, value: string): this {
    this.attributes[key] = value;
    return this;
  }

  build(): Attributes {
    return this.attributes;
  }
}

export { MetricsAttributeBuilder };
