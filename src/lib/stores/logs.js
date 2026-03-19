import { writable, get as getStoreValue } from 'svelte/store';

const logs = writable([]);
const total = writable(0);

let logCounter = 0;

function _add(data, type) {
    logs.update(current => {
        const newLog = {
            id: logCounter++,
            timestamp: new Date().toLocaleTimeString(),
                data,
                type,
                preview: JSON.stringify(data).slice(data.request ? 20 : 21)
        };

        const next = [newLog, ...current];
        return next.slice(0, 100);
    });
    total.update(x => x + 1);
}

const add = data => _add(data, data.request ? 'request' : 'response')

function error(text) {
    _add(text, 'error')
}

function get() {
    return getStoreValue(logs)
}

export {
    add,
    get,
    total,
    error
}

export default logs
