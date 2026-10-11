import { Module } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

import { METER } from './meter.constant';
import { ConfigService } from '@nestjs/config';
import { createServiceResource } from '../resource/service';

@Module({
  providers: [
    {
      provide: METER.PROVIDER_TOKEN,
      useFactory: (config: ConfigService) => {
        const exporter = new OTLPMetricExporter({
          url:
            config.get<string>('METRICS_OTLP_EXPORTER_ENDPOINT') ||
            'http://127.0.0.1:4318/v1/metrics',
        });
        const reader = new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis: 3000, // Export every 3 seconds
        });
        const meterProvider = new MeterProvider({
          resource: createServiceResource(
            config.get<string>('SERVICE_NAME'),
            config.get<string>('SERVICE_VERSION'),
          ),
          readers: [reader],
        });
        metrics.setGlobalMeterProvider(meterProvider);

        return meterProvider.getMeter(
          config.get<string>('METRICS_INSTRUMENTATION_NAME') ||
            'io.opentelemetry.metrics.js',
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [METER.PROVIDER_TOKEN],
})
export class MeterModule {}
