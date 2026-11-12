/**
 * Circular fixed-size buffer — tránh array grow/shrink/clone liên tục.
 * Write: O(1), Read: O(n), không gây áp lực rác bộ nhớ (GC pressure).
 */
export class RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head = 0;
  private size = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size += 1;
    }
  }

  pushMany(items: T[]): void {
    for (let i = 0; i < items.length; i += 1) {
      this.push(items[i]);
    }
  }

  toArray(): T[] {
    if (this.size === 0) return [];
    const result: T[] = new Array(this.size);
    for (let i = 0; i < this.size; i += 1) {
      result[i] = this.buffer[(this.head - this.size + i + this.capacity) % this.capacity] as T;
    }
    return result;
  }

  get length(): number {
    return this.size;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}
