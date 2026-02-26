import { writable, get as getStoreValue } from 'svelte/store';

const logs = writable([]);
const total = writable(0);

let logCounter = 0;

function add(data) {
    logs.update(current => {
        const newLog = {
            id: logCounter++,
            timestamp: new Date().toLocaleTimeString(),
                data: data,
                type: data.request ? 'request' : 'response',
                preview: JSON.stringify(data).slice(data.request ? 20 : 21)
        };

        const next = [newLog, ...current];
        return next.slice(0, 100);
    });
    total.update(x => x + 1);
}

function get() {
    return getStoreValue(logs)
}

export {
    add,
    get,
    total
}

export default logs
