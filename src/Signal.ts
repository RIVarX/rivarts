export class Signal<T> {
  static _priorityIterator = 0;
  value: T | undefined;
  prioritySet: number[];

  constructor(value: T | undefined, prioritySet?: number[]) {
    this.value = value;
    this.prioritySet = prioritySet ?? [++Signal._priorityIterator];
  }

  compareTo(other: Signal<T> | undefined): number {
    if (this.isPrioritized(other, this)) {
      return -1;
    }
    if (this.isPrioritized(this, other)) {
      return 1;
    }
    return 0;
  }

  isRejectedBySubsetCheck(other: Signal<T> | undefined): boolean {
    if (!other) {
      return false;
    }

    return other.prioritySet.length < this.prioritySet.length && other.prioritySet.every(priority => this.prioritySet.includes(priority));
  }

  private isPrioritized(signal: Signal<T> | undefined, thanSignal: Signal<T> | undefined): boolean {
    const signalSet = signal?.prioritySet ?? [0];
    const otherSignalSet = thanSignal?.prioritySet ?? [0];
    const signalOnlySet = signalSet.filter(newSignal => !otherSignalSet.includes(newSignal));
    const otherSignalOnlySet = otherSignalSet.filter(oldSignal => !signalSet.includes(oldSignal));

    if (
      otherSignalOnlySet.length > 0 &&
      signalOnlySet.length > 0 &&
      signalOnlySet.every(newSignal => otherSignalOnlySet.every(oldSignal => newSignal > oldSignal))
    ) {
      return true;
    }

    if (signal != null && signalSet.length > 0 && signalOnlySet.length === 0 && otherSignalOnlySet.length > 0) {
      return true;
    }

    return false;
  }

  equals(other: Signal<T>): boolean {
    if (this.value !== other.value) {
      return false;
    }
    if (this.prioritySet.length !== other.prioritySet.length) {
      return false;
    }
    for (let i = 0; i < this.prioritySet.length; i += 1) {
      if (this.prioritySet[i] !== other.prioritySet[i]) {
        return false;
      }
    }
    return true;
  }
}
