export interface Observer<T> {
  next(value: T): void;
  error(err: unknown): void;
  complete(): void;
}

export type ObserverOrNext<T> = Observer<T> | ((value: T) => void);

export interface Subscription {
  unsubscribe(): void;
}

function toObserver<T>(observerOrNext: ObserverOrNext<T>, error?: (err: unknown) => void, complete?: () => void): Observer<T> {
  if (typeof observerOrNext === 'function') {
    return {
      next: observerOrNext,
      error: error ?? (() => {}),
      complete: complete ?? (() => {})
    };
  }

  return {
    next: typeof observerOrNext.next === 'function' ? observerOrNext.next.bind(observerOrNext) : () => {},
    error: typeof observerOrNext.error === 'function' ? observerOrNext.error.bind(observerOrNext) : () => {},
    complete: typeof observerOrNext.complete === 'function' ? observerOrNext.complete.bind(observerOrNext) : () => {}
  };
}

export interface Observable<T> {
  subscribe(observerOrNext: ObserverOrNext<T>, error?: (err: unknown) => void, complete?: () => void): Subscription;
  pipe(...operators: Array<(source: Observable<any>) => Observable<any>>): Observable<any>;
}

export type Teardown = Subscription | void;

export function createObservable<T>(subscribe: (observer: Observer<T>) => Teardown): Observable<T> {
  return {
    subscribe(observerOrNext: ObserverOrNext<T>, error?: (err: unknown) => void, complete?: () => void) {
      const observer = toObserver(observerOrNext, error, complete);
      const cleanup = subscribe(observer);
      return cleanup && typeof cleanup.unsubscribe === 'function'
        ? cleanup
        : { unsubscribe() {} };
    },

    pipe(...operators: Array<(source: Observable<any>) => Observable<any>>): Observable<any> {
      return operators.reduce((source, operator) => operator(source), this as unknown as Observable<any>);
    }
  };
}

export class Subject<T> implements Observable<T> {
  private observers: Observer<T>[] = [];

  subscribe(observerOrNext: ObserverOrNext<T>, error?: (err: unknown) => void, complete?: () => void): Subscription {
    const observer = toObserver(observerOrNext, error, complete);
    this.observers.push(observer);
    return {
      unsubscribe: () => {
        this.observers = this.observers.filter(item => item !== observer);
      }
    };
  }

  next(value: T): void {
    [...this.observers].forEach(observer => observer.next(value));
  }

  error(err: unknown): void {
    [...this.observers].forEach(observer => observer.error(err));
  }

  complete(): void {
    [...this.observers].forEach(observer => observer.complete());
  }

  pipe(...operators: Array<(source: Observable<any>) => Observable<any>>): Observable<any> {
    return operators.reduce((source, operator) => operator(source), this as unknown as Observable<any>);
  }
}

export function map<T, R>(selector: (value: T) => R) {
  return (source: Observable<T>): Observable<R> =>
    createObservable<R>(observer =>
      source.subscribe(
        value => observer.next(selector(value)),
        err => observer.error(err),
        () => observer.complete()
      )
    );
}

export function filter<T>(predicate: (value: T) => boolean) {
  return (source: Observable<T>): Observable<T> =>
    createObservable<T>(observer =>
      source.subscribe(
        value => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        err => observer.error(err),
        () => observer.complete()
      )
    );
}

export function scan<T>(accumulator: (previous: T, current: T) => T) {
  return (source: Observable<T>): Observable<T> =>
    createObservable<T>(observer => {
      let hasPrevious = false;
      let previous: T;
      return source.subscribe(
        value => {
          if (!hasPrevious) {
            previous = value;
            hasPrevious = true;
          } else {
            previous = accumulator(previous, value);
          }
          observer.next(previous!);
        },
        err => observer.error(err),
        () => observer.complete()
      );
    });
}

export function distinctUntilChanged<T>() {
  return (source: Observable<T>): Observable<T> =>
    createObservable<T>(observer => {
      let hasPrevious = false;
      let previous: T;
      return source.subscribe(
        value => {
          const isEqual = hasPrevious && typeof (value as any)?.equals === 'function'
            ? (value as any).equals(previous)
            : value === previous;
          if (!hasPrevious || !isEqual) {
            previous = value;
            hasPrevious = true;
            observer.next(value);
          }
        },
        err => observer.error(err),
        () => observer.complete()
      );
    });
}

export function startWith<T>(initialValue: T) {
  return (source: Observable<T>): Observable<T> =>
    createObservable<T>(observer => {
      observer.next(initialValue);
      return source.subscribe(observer);
    });
}

export function withLatestFrom<T, U, R>(other: Observable<U>, project: (value: T, latest: U) => R) {
  return (source: Observable<T>): Observable<R> =>
    createObservable<R>(observer => {
      let latestOther: U;
      let hasOther = false;
      const otherSubscription = other.subscribe(
        value => {
          latestOther = value;
          hasOther = true;
        },
        err => observer.error(err)
      );
      const sourceSubscription = source.subscribe(
        value => {
          if (hasOther) {
            observer.next(project(value, latestOther));
          }
        },
        err => observer.error(err),
        () => observer.complete()
      );
      return {
        unsubscribe() {
          otherSubscription.unsubscribe();
          sourceSubscription.unsubscribe();
        }
      };
    });
}

export function combineLatest<T, R>(sources: Observable<any>[], project: (...values: any[]) => R) {
  return createObservable<R>(observer => {
    const values: T[] = [];
    const hasValue: boolean[] = Array(sources.length).fill(false);
    const subscriptions = sources.map((source, index) =>
      source.subscribe(
        value => {
          values[index] = value;
          hasValue[index] = true;
          if (hasValue.every(Boolean)) {
            observer.next(project(...values));
          }
        },
        err => observer.error(err)
      )
    );
    return {
      unsubscribe() {
        subscriptions.forEach(subscription => subscription.unsubscribe());
      }
    };
  });
}

export function share<T>() {
  return (source: Observable<T>): Observable<T> =>
    createObservable<T>(observer => source.subscribe(observer));
}
