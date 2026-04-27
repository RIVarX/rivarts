import { Signal } from './Signal.js';
import type { Observable } from './Observable.js';
import { combineLatest, distinctUntilChanged, map, scan, share } from './Observable.js';

function produceResult<T1, T2, TResult>(
  resultSelector: (x: T1, y: T2) => TResult,
  x: Signal<T1> | undefined,
  y: Signal<T2> | undefined
): Signal<TResult> | undefined {
  if (x && y) {
    if (x.value !== undefined && x.value !== null && y.value !== undefined && y.value !== null) {
      return new Signal<TResult>(resultSelector(x.value, y.value), [...new Set([...x.prioritySet, ...y.prioritySet])]);
    }
    return new Signal<TResult>(undefined, [...new Set([...x.prioritySet, ...y.prioritySet])]);
  }
  if (x) {
    return new Signal<TResult>(undefined, [...new Set([...x.prioritySet, 0])]);
  }
  if (y) {
    return new Signal<TResult>(undefined, [...new Set([...y.prioritySet, 0])]);
  }
  return undefined;
}

function monotonic<T>(source: Observable<Signal<T>>): Observable<Signal<T>> {
  return source.pipe(
    scan((previous, current) => {
      if (!previous) {
        return current;
      }
      return current.compareTo(previous) > 0 ? current : previous;
    }),
    distinctUntilChanged(),
    share()
  );
}

export function lift<T1, T2, TResult>(
  func: (x: T1, y: T2) => TResult,
  operand1: Observable<Signal<T1>>,
  operand2?: Observable<Signal<T2>>
): Observable<Signal<TResult>> {
  if (operand2 !== undefined) {
    const firstStream = monotonic(operand1);
    const secondStream = monotonic(operand2);
    const combinedStream = combineLatest([firstStream, secondStream], (x, y) => {
      const result = produceResult(func, x as Signal<T1>, y as Signal<T2>);
      if (result === undefined) {
        throw new Error('Invalid lift input: missing signal');
      }
      return result;
    });

    return combinedStream.pipe(share());
  }

  return monotonic(operand1).pipe(
    map(x => new Signal<TResult>(func(x.value as T1, x.value as unknown as T2), x.prioritySet)),
    share()
  );
}
