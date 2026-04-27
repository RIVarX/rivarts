import { Subject } from './Observable.js';
import { Signal } from './Signal.js';
import type { TraceSink } from './Trace.js';
import { filter, map, share, startWith, withLatestFrom } from './Observable.js';
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
    const targetWithInitialValue = this.pipe(startWith(new Signal<T>(undefined, [0])));
    const streamOfChanges = source.pipe(
      withLatestFrom(targetWithInitialValue, (valueInSource, valueInTarget) => ({ valueInSource, valueInTarget }))
    );

    const streamOfChangesInSource = streamOfChanges.pipe(
      filter((change): change is { valueInSource: Signal<T>; valueInTarget: Signal<T> } => {
        if (change.valueInSource === undefined) {
          return false;
        }

        const comparison = change.valueInSource.compareTo(change.valueInTarget);
        if (comparison > 0) {
          return true;
        }

        if (change.valueInSource.isRejectedBySubsetCheck(change.valueInTarget)) {
          this.traceSink?.record({
            variableName: this.name,
            signal: change.valueInSource,
            accepted: false,
            rejectionReason: 'Subset check'
          });
        }

        return false;
      }),
      map(change => change.valueInSource),
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
