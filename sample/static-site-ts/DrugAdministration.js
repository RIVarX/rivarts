import { RIVar, lift, Signal, TraceCollector } from '../../dist/index.js';
const roundToTwo = (value) => Number(value.toFixed(2));
const div = (x, y) => (y === 0 ? 0 : roundToTwo(x / y));
const mul = (x, y) => roundToTwo(x * y);
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
    const setTraceStatus = (message) => {
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
            }
            else {
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
        }
        catch {
            setTraceStatus('Copy failed');
        }
    });
};
class Bag {
    constructor() {
        this.amount = new RIVar('Drug_Amount', trace);
        this.volume = new RIVar('Volume', trace);
        this.concentration = new RIVar('Concentration', trace);
        this.concentration.set(lift(div, this.amount, this.volume));
        this.amount.set(lift(mul, this.concentration, this.volume));
        this.volume.set(lift(div, this.amount, this.concentration));
    }
}
class Pump {
    constructor(bag) {
        this.rate = new RIVar('Rate_Control', trace);
        this.dose = new RIVar('Dose_Control', trace);
        this.duration = new RIVar('Duration_Control', trace);
        this.theBag = bag;
        this.dose.set(lift(div, this.theBag.amount, this.duration));
        this.rate.set(lift(div, this.theBag.volume, this.duration));
        this.duration.set(lift(div, this.theBag.amount, this.dose));
        this.duration.set(lift(div, this.theBag.volume, this.rate));
        this.theBag.amount.set(lift(mul, this.duration, this.dose));
        this.theBag.volume.set(lift(mul, this.duration, this.rate));
    }
}
const toNumber = (value) => Number(value) || 0;
const formatNumber = (value) => String(Number(value.toFixed(2)));
const bind = (inputId, variable) => {
    const input = document.getElementById(inputId);
    if (!input)
        throw new Error(`Missing input element: ${inputId}`);
    input.addEventListener('input', (event) => {
        variable.next(new Signal(toNumber(event.target.value)));
        input.style.fontStyle = 'normal';
        syncTrace();
    });
    variable.subscribe((val) => {
        const value = formatNumber(val?.value ?? 0);
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
window.addEventListener('DOMContentLoaded', () => {
    bindTraceControls();
});
