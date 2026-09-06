import { Signal } from './Signal.js';

export type TraceRejectionReason = 'Subset check' | 'Ignored';

export interface TraceEvent<T> {
  variableName: string;
  signal: Signal<T>;
  accepted: boolean;
  rejectionReason?: TraceRejectionReason;
}

export interface TraceSink {
  record<T>(event: TraceEvent<T>): void;
}

function formatPrioritySet(prioritySet: number[]): string {
  return `<{${prioritySet.join(',')}}>`;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'null';
  }
  if (typeof value === 'number') {
    return String(Number(value.toFixed(2)));
  }
  return String(value);
}

export function formatTraceEvent<T>(event: TraceEvent<T>): string {
  if (event.accepted) {
    return `${event.variableName}: ${formatValue(event.signal.value)} ${formatPrioritySet(event.signal.prioritySet)}`;
  }

  return `${event.variableName}: [REJECTED - ${event.rejectionReason ?? 'Ignored'} value=${formatValue(event.signal.value)} ${formatPrioritySet(event.signal.prioritySet)}]`;
}

export class TraceCollector implements TraceSink {
  private entries: string[] = [];

  record<T>(event: TraceEvent<T>): void {
    this.entries.push(formatTraceEvent(event));
  }

  lines(): string[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  toString(): string {
    return this.entries.map((entry, index) => `${index + 1}. ${entry}`).join('\n');
  }
}