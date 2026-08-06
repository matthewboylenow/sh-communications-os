import type { DomainEvent, EventType, Handler } from "./types";

/**
 * In-process typed event bus.
 *
 * Deliberately simple. Handlers are fire-and-forget and a thrown handler is
 * logged, never propagated, because a subscriber failing must not roll back
 * the thing that emitted. When a module needs guaranteed delivery it should
 * write its own outbox table rather than making this bus clever.
 *
 * Swapping this for a real queue later means replacing this file only.
 */

type Registry = { [K in EventType]?: Handler<K>[] };

const registry: Registry = {};

export function on<T extends EventType>(type: T, handler: Handler<T>): () => void {
  const list = (registry[type] ??= []) as Handler<T>[];
  list.push(handler);
  return () => {
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  };
}

export async function emit(event: DomainEvent): Promise<void> {
  const list = registry[event.type] as Handler<EventType>[] | undefined;
  if (!list?.length) return;
  await Promise.all(
    list.map(async (handler) => {
      try {
        await handler(event as never);
      } catch (err) {
        console.error(`[events] handler for ${event.type} failed`, err);
      }
    }),
  );
}

/** Test helper. Not used in application code. */
export function _resetBus() {
  for (const key of Object.keys(registry) as EventType[]) delete registry[key];
}
