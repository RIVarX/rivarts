import { Subject } from './Observable.js';
import { Signal } from './Signal.js';
import type { TraceSink } from './Trace.js';
import { filter, map, share } from './Observable.js';
import type { Observable } from './Observable.js';

export class RIVar<T> extends Subject<Signal<T>> {
  name: string;
  streamOfChangesInSources: Observable<Signal<T>>[] = [];
  prev?: Signal<T>;
  traceSink?: TraceSink;

  constructor(name = 'Unknown', traceSink?: TraceSink) {
    super();
    this.name = name;
    this.traceSink = traceSink;
  }

  toString(): string {
    const value = this.prev?.value === undefined ? 'null' : this.prev?.value ?? 'no value';
    return `RIVar(${this.name}) = ${value}`;
  }

  set(source: Observable<Signal<T>>): void {
    const streamOfChangesInSource = source.pipe(
      filter(valueInSource => {
        const valueInTarget = this.prev ?? new Signal<T>(undefined, [0]);

        if (valueInSource === undefined) {
          return false;
        }

        if (valueInSource.isRejectedBySubsetCheck(valueInTarget)) {
          this.traceSink?.record({
            variableName: this.name,
            signal: valueInSource,
            accepted: false,
            rejectionReason: 'Subset check'
          });
          return false;
        }

        const comparison = valueInSource.compareTo(valueInTarget);
        if (comparison > 0) {
          return true;
        }

        return false;
      }),
      map(valueInSource => valueInSource),
      share()
    );

    this.streamOfChangesInSources.push(streamOfChangesInSource);

    streamOfChangesInSource.subscribe(x => {
      this.next(x);
    });
  }

  next(value: Signal<T>): void {
    if (!this.prev || this.prev.compareTo(value) !== 0) {
      this.prev = value;
      this.traceSink?.record({
        variableName: this.name,
        signal: value,
        accepted: true
      });
      super.next(value);
    } else {
      this.prev = value;
    }
  }
}
