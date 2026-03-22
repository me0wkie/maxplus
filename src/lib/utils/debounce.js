const promises = {}

export const debounce = async (name, time) => {
    if (promises[name]) {
        promises[name](true)
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            promises[name](false)
        }, time)

        promises[name] = cancel => {
            clearTimeout(timeout)
            resolve(cancel)
        };
    });
}
