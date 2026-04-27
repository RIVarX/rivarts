export {};

import { RIVar, lift, Signal, TraceCollector } from '../../dist/index.js';

const div = (x: number, y: number) => (y === 0 ? 0 : x / y);
const mul = (x: number, y: number) => x * y;
const trace = new TraceCollector();

const syncTrace = () => {
    const traceOutput = document.getElementById('trace-output');
    if (!traceOutput) {
        return;
    }

    traceOutput.textContent = trace.toString() || 'No trace yet.';
};

const bindTraceControls = () => {
    const clearButton = document.getElementById('clear-trace');
    const copyButton = document.getElementById('copy-trace');
    const traceStatus = document.getElementById('trace-status');

    const setTraceStatus = (message: string) => {
        if (!traceStatus) {
            return;
        }

        traceStatus.textContent = message;
    };

    if (!clearButton) {
        return;
    }

    clearButton.addEventListener('click', () => {
        trace.clear();
        syncTrace();
        setTraceStatus('Trace cleared');
    });

    if (!copyButton) {
        return;
    }

    copyButton.addEventListener('click', async () => {
        const traceText = trace.toString() || 'No trace yet.';

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(traceText);
            } else {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = traceText;
                tempTextArea.setAttribute('readonly', 'true');
                tempTextArea.style.position = 'absolute';
                tempTextArea.style.left = '-9999px';
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
            }

            setTraceStatus('Trace copied');
        } catch {
            setTraceStatus('Copy failed');
        }
    });
};

class Bag {
    amount: RIVar<number>;
    volume: RIVar<number>;
    concentration: RIVar<number>;
    constructor() {
        this.amount = new RIVar<number>('Drug_Amount');
        this.volume = new RIVar<number>('Volume');
        this.concentration = new RIVar<number>('Concentration');
        this.concentration.set(lift(div, this.amount, this.volume));
        this.amount.set(lift(mul, this.concentration, this.volume));
        this.volume.set(lift(div, this.amount, this.concentration));
    }
}

class Pump {
    rate: RIVar<number>;
    dose: RIVar<number>;
    duration: RIVar<number>;
    theBag: Bag;
    constructor(bag: Bag) {
        this.rate = new RIVar<number>('Rate_Control', trace);
        this.dose = new RIVar<number>('Dose_Control', trace);
        this.duration = new RIVar<number>('Duration_Control', trace);
        this.theBag = bag;
        this.dose.set(lift(div, this.theBag.amount, this.duration));
        this.rate.set(lift(div, this.theBag.volume, this.duration));
        this.duration.set(lift(div, this.theBag.amount, this.dose));
        this.duration.set(lift(div, this.theBag.volume, this.rate));
        this.theBag.amount.set(lift(mul, this.duration, this.dose));
        this.theBag.volume.set(lift(mul, this.duration, this.rate));
    }
}

const toNumber = (value: string) => Number(value) || 0;
const bind = (inputId: string, variable: RIVar<number>) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) throw new Error(`Missing input element: ${inputId}`);
    input.addEventListener('input', (event) => {
        variable.next(new Signal<number>(toNumber((event.target as HTMLInputElement).value)));
        input.style.fontStyle = 'normal';
        syncTrace();
    });
    variable.subscribe((val: Signal<number>) => {
        const value = String(val?.value ?? 0);
        if (input.value !== value) {
            input.value = value;
            input.style.fontStyle = 'italic';
        }
        syncTrace();
    });
};

const bag = new Bag();
const pump = new Pump(bag);
bind('drug', bag.amount);
bind('concentration', bag.concentration);
bind('volume', bag.volume);
bind('dose', pump.dose);
bind('duration', pump.duration);
bind('rate', pump.rate);

const init = () => {
    (document.getElementById('drug') as HTMLInputElement).value = '10';
    (document.getElementById('duration') as HTMLInputElement).value = '20';
    (document.getElementById('rate') as HTMLInputElement).value = '5';
    pump.rate.next(new Signal<number>(5, [3]));
    pump.duration.next(new Signal<number>(20, [2, 3]));
    bag.amount.next(new Signal<number>(10, [1]));
    syncTrace();
};
window.addEventListener('DOMContentLoaded', () => {
    bindTraceControls();
    init();
});
