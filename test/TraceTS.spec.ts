import { expect } from 'chai';
import { RIVar, Signal, TraceCollector, lift } from '../src/index.js';

describe('Trace TS', function () {
  it('records accepted and rejected subset updates', function () {
    const div = (x: number, y: number) => (y === 0 ? 0 : x / y);

    const trace = new TraceCollector();
    const drugAmount = new RIVar<number>('Drug_Amount');
    const rateControl = new RIVar<number>('Rate_Control', trace);
    const durationControl = new RIVar<number>('Duration_Control', trace);
    const doseControl = new RIVar<number>('Dose_Control', trace);

    doseControl.set(lift(div, drugAmount, durationControl));
    durationControl.set(lift(div, drugAmount, doseControl));

    rateControl.next(new Signal(5, [3]));
    durationControl.next(new Signal(20, [2, 3]));
    drugAmount.next(new Signal(10, [1]));

    expect(trace.toString()).to.equal(
      [
        '1. Rate_Control: 5 <{3}>',
        '2. Duration_Control: 20 <{2,3}>',
        '3. Dose_Control: 0.5 <{1,2,3}>',
        '4. Duration_Control: [REJECTED - Subset check <{1,2,3}>]'
      ].join('\n')
    );
  });
});