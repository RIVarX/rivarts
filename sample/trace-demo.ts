import { RIVar, Signal, TraceCollector, lift } from '../src/index.js';

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

console.log(trace.toString());