import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';

import { createServiceResource } from '../resource/service';

const exporter = new OTLPTraceExporter({
  url:
    process.env.TRACING_OTLP_EXPORTER_ENDPOINT ||
    'http://otel-collector:4318/v1/traces',
});
const provider = new NodeTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)],
  resource: createServiceResource(
    process.env.SERVICE_NAME,
    process.env.SERVICE_VERSION,
  ),
});

registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': {
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE],
      },
      '@opentelemetry/instrumentation-router': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-pg': {
        enhancedDatabaseReporting: true,
      },
    }),
  ],
});
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

provider.register();
