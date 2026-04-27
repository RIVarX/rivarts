import { expect } from 'chai';
import { Signal } from '../src/Signal.js';
import { RIVar } from '../src/RIVar.js';
import { lift } from '../src/Lift.js';

describe('Bag and Pump TS', function () {
  const div = (x: number, y: number) => x / y;
  const mul = (x: number, y: number) => x * y;

  class Bag {
    amount = new RIVar<number>('amount');
    volume = new RIVar<number>('volume');
    concentration = new RIVar<number>('concentration');

    constructor() {
      this.concentration.set(lift(div, this.amount, this.volume));
      this.amount.set(lift(mul, this.concentration, this.volume));
      this.volume.set(lift(div, this.amount, this.concentration));
    }
  }

  class Pump {
    rate = new RIVar<number>('rate');
    dose = new RIVar<number>('dose');
    duration = new RIVar<number>('duration');
    theBag: Bag;

    constructor(bag: Bag) {
      this.theBag = bag;
      this.dose.set(lift(div, this.theBag.amount, this.duration));
      this.rate.set(lift(div, this.theBag.volume, this.duration));
      this.duration.set(lift(div, this.theBag.amount, this.dose));
      this.duration.set(lift(div, this.theBag.volume, this.rate));
      this.theBag.amount.set(lift(mul, this.duration, this.dose));
      this.theBag.volume.set(lift(mul, this.duration, this.rate));
    }
  }

  it('calculates concentration correctly', function () {
    const bag = new Bag();
    let result = 0;

    bag.concentration.subscribe({
      next: value => {
        result = value.value ?? 0;
      },
      error: () => {},
      complete: () => {}
    });

    bag.amount.next(new Signal(100));
    bag.volume.next(new Signal(200));

    expect(result).to.equal(0.5);
  });

  it('keeps pump stable and does not duplicate notifications', function () {
    const bag = new Bag();
    const pump = new Pump(bag);

    let result = 0;
    let numberOfUpdates = 0;

    bag.amount.subscribe({
      next: value => {
        result = value.value ?? 0;
        numberOfUpdates += 1;
      },
      error: () => {},
      complete: () => {}
    });

    bag.concentration.next(new Signal(0.5));
    pump.rate.next(new Signal(10));
    pump.duration.next(new Signal(5));

    expect(numberOfUpdates).to.equal(1);
  });
});
