import { Batch, Concurrency } from '@lzptec/concurrency';

const data = Array.from({ length: 20 }, (_, idx) => idx);
Batch;
Concurrency;



const run = async () => {
    let idx = 0;
    const batchInstance = new Batch(4);
    const concurrencyInstance = new Concurrency(4);

    const map = {
        'Batch.map 4': await Batch.map(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Batch.map ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        })),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'BatchInstance.map 4': await batchInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.map ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        })),
        _0: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.map 4': await Concurrency.map(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Concurrency.map ${idx++}`)
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        })),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'ConcurrencyInstance.map 4': await concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.map ${idx++}`)
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        })),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.all': await Promise.all(data.map(async item => new Promise((resolve) => {
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        }))),
        _3: (() => { idx = 0; globalThis.gc?.(); })(),

    };
    map;
    // console.log(map)

    const mapSettled = {
        'Batch.mapSettled 4': await Batch.mapSettled(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Batch.mapSettled ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
        })),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.mapSettled 4': await Concurrency.mapSettled(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Concurrency.mapSettled ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
        })),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.allSettled': await Promise.allSettled(data.map(async item => new Promise((resolve) => {
            console.log(`Promise.allSettled ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
        }))),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

    };
    mapSettled;
    // console.log(mapSettled)

    const forEach = {
        'Batch.forEach 4': await Batch.forEach(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Batch.forEach ${idx++}`)
            setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
        })),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.forEach 4': await Concurrency.forEach(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Concurrency.forEach ${idx++}`)
            setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
        })),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.all(void)': await Promise.all(data.map(async item => new Promise<void>((resolve) => {
            console.log(`Promise.all(void) ${idx++}`)
            setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
        }))),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

    };
    forEach;
    // console.log(forEach);

};

run()
    .then(() => console.log('Done'))
    .catch(err => console.error(err));