export function sum(arr) {
    return arr.reduce(function (a, b) {
       return a + b;
    }, 0);
}

/* export function* enumerate(iterable) {
    let i = 0;

    for (const x of iterable) {
        yield [i, x];
        i++;
    }
} */
