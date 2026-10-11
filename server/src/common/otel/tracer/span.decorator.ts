import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api';

/**
 * Decorator to create a span for a method.
 * Useful for tracing database operations and other slow operations.
 *
 * @param spanName - Name of the span
 * @param attributes - Optional attributes to add to the span
 *
 * @example
 * ```typescript
 * @WithSpan('database.query.historical_events')
 * async getEvents(query: HistoricalEventQueryDto) {
 *   // Your code here
 * }
 * ```
 */
export function WithSpan(
  tracerName: string,
  spanName: string,
  attributes?: Record<string, string | number | boolean>,
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracer = trace.getTracer(tracerName);
      const span = tracer.startSpan(spanName, {
        attributes: {
          ...attributes,
          'service.method': propertyKey,
        },
      });

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * Create a span in code to trace specific operations
 * @example
 * ```typescript
 * const { span, context: spanContext } = createSpan('database.prisma.query');
 * try {
 *   const result = await context.with(spanContext, async () => {
 *     return this.prisma.historicalEvent.findMany();
 *   });
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createSpan(
  tracerName: string,
  spanName: string,
  attributes?: Record<string, string | number | boolean>,
) {
  const tracer = trace.getTracer(tracerName);
  const span = tracer.startSpan(spanName, { attributes });
  const spanContext = trace.setSpan(context.active(), span);

  return { span, context: spanContext };
}

/**
 * Utility to add child spans within an operation
 * @example
 * ```typescript
 * const span = trace.getActiveSpan();
 * addSpanEvent(span, 'cache_hit', { cacheKey: 'events:all' });
 * ```
 */
export function addSpanAttributes(
  span: Span | undefined,
  attributes: Record<string, string | number | boolean>,
) {
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Utility to record timing of an operation
 * @example
 * ```typescript
 * const span = trace.getActiveSpan();
 * await recordOperationTiming(span, 'prisma.query', async () => {
 *   return this.prisma.historicalEvent.findMany();
 * });
 * ```
 */
export async function recordOperationTiming<T>(
  tracerName: string,
  operationName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const { span } = createSpan(tracerName, operationName);
  try {
    const result = await operation();

    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  }
}
