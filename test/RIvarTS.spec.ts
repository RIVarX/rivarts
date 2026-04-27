import { expect } from 'chai';
import { RIVar } from '../src/RIVar.js';
import { Signal } from '../src/Signal.js';
import { lift } from '../src/Lift.js';

describe('RIVar TS', function () {
  it('should calculate sum of two RIVars', function () {
    const X = new RIVar<number>('X');
    const Y = new RIVar<number>('Y');
    const Z = new RIVar<number>('Z');

    Z.set(lift((x, y) => x + y, X, Y));

    let result = 0;
    Z.subscribe({
      next: value => {
        result = value.value ?? 0;
      },
      error: () => {},
      complete: () => {}
    });

    X.next(new Signal(2));
    Y.next(new Signal(3));

    expect(result).to.equal(5);
  });
});
