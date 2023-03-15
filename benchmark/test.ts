import { Batch, Concurrency } from '@lzptec/concurrency';
import { inspect } from 'util';

const data = Array.from({ length: 15 }, (_, idx) => idx);
Batch;
Concurrency;

const globalMaxConcurrency = 4;
const instanceMaxConcurrency = 4;

const globalBatchSize = 4;
const instanceBatchSize = 4;

const run = async () => {
    let idx = 0;
    const batchInstance = new Batch({
        batchSize: instanceBatchSize
    });
    const concurrencyInstance = new Concurrency({
        maxConcurrency: instanceMaxConcurrency
    });

    console.info(`Concurrency Settings: `);
    console.info(inspect({
        'Global Max Concurrency': globalMaxConcurrency,
        'Instance Max Concurrency': instanceMaxConcurrency
    }, {
        compact: false,
        colors: true
    }));


    console.info(`Batch Settings: `);
    console.info(inspect({
        'Global Batch Size': globalBatchSize,
        'Instance Batch Size': instanceBatchSize
    }, {
        compact: false,
        colors: true
    }));

    // const mapSharedBatch = {
    //     'BatchInstance.map 4': await Promise.all([
    //         batchInstance.map(data, async (item) => new Promise((resolve) => {
    //             console.log(`BatchInstance.map ${idx++} - Item ${item}`)
    //             setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
    //         })),
    //         batchInstance.map(data, async (item) => new Promise((resolve) => {
    //             console.log(`BatchInstance.map ${idx++} - Item ${item}`)
    //             setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
    //         }))
    //     ]),
    //     _0: (() => { idx = 0; globalThis.gc?.(); })(),

    //     'ConcurrencyInstance.map 4': await Promise.all([
    //         concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
    //             console.log(`ConcurrencyInstance.map ${idx++} - Item ${item}`)
    //             setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
    //         })),
    //         concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
    //             console.log(`ConcurrencyInstance.map ${idx++} - Item ${item}`)
    //             setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
    //         }))
    //     ]),
    //     _1: (() => { idx = 0; globalThis.gc?.(); })(),
    // }
    // mapSharedBatch;

    console.log(`-- Map --`);
    const map = {
        'Batch.map': await Batch.map({
            input: data,
            batchSize: globalBatchSize,
            task: async (item) => new Promise((resolve) => {
                console.log(`Batch.map ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
            })
        }),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'BatchInstance.map': await batchInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.map ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
        })),
        _0: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.map': await Concurrency.map({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.map ${idx++}`)
                setTimeout(() => resolve(item * item + 1), 400 + (idx * 50));
            })
        }),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'ConcurrencyInstance.map': await concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
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
    console.log(JSON.stringify(map));

    console.log(`-- Group --`);
    const group = {
        'Batch.group': await Batch.group({
            input: data,
            batchSize: globalBatchSize,
            task: async (item) => new Promise((resolve) => {
                console.log(`Batch.group ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item.toString()), 400 + (idx * 50));
            })
        }),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'BatchInstance.group': await batchInstance.group(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.group ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item.toString()), 400 + (idx * 50));
        })),
        _0: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.group': await Concurrency.group({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.group ${idx++}`)
                setTimeout(() => resolve(item.toString()), 400 + (idx * 50));
            })
        }),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'ConcurrencyInstance.group': await concurrencyInstance.group(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.group ${idx++}`)
            setTimeout(() => resolve(item.toString()), 400 + (idx * 50));
        })),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),
    };
    group;
    console.log(JSON.stringify(group));

    const filterSymbol = Symbol();

    console.log(`-- Filter --`);
    const filter = {
        'Batch.filter': await Batch.filter({
            input: data,
            batchSize: globalBatchSize,
            predicate: async (item) => new Promise((resolve) => {
                console.log(`Batch.filter ${idx++} - Item ${item}`)
                setTimeout(() => resolve(item % 2 === 0), 400 + (idx * 50));
            })
        }),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'BatchInstance.filter': await batchInstance.filter(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.filter ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item % 2 === 0), 400 + (idx * 50));
        })),
        _0: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.filter': await Concurrency.filter({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            predicate: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.filter ${idx++}`)
                setTimeout(() => resolve(item % 2 === 0), 400 + (idx * 50));
            })
        }),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'ConcurrencyInstance.filter': await concurrencyInstance.filter(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.filter ${idx++}`)
            setTimeout(() => resolve(item % 2 === 0), 400 + (idx * 50));
        })),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.all': await Promise.all(data.map(async item => new Promise((resolve) => {
            setTimeout(() => resolve(item % 2 === 0 ? item : filterSymbol), 400 + (idx * 50));
        }))).then(res => res.filter((x): x is number => x !== filterSymbol)),
        _3: (() => { idx = 0; globalThis.gc?.(); })(),
    };
    filter;
    console.log(JSON.stringify(filter));

    console.log(`-- MapSettled --`);
    const mapSettled = {
        'Batch.mapSettled': await Batch.mapSettled({
            input: data,
            batchSize: globalBatchSize,
            task: async (item) => new Promise((resolve) => {
                console.log(`Batch.mapSettled ${idx++}`)
                setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
            })
        }),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.mapSettled': await Concurrency.mapSettled({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.mapSettled ${idx++}`)
                setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
            })
        }),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.allSettled': await Promise.allSettled(data.map(async item => new Promise((resolve) => {
            console.log(`Promise.allSettled ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 400 + (idx * 50));
        }))),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

    };
    mapSettled;
    console.log(JSON.stringify(mapSettled));

    console.log(`-- ForEach --`);
    const forEach = {
        'Batch.forEach': await Batch.forEach({
            input: data,
            batchSize: globalBatchSize,
            task: async (item) => new Promise<void>((resolve) => {
                console.log(`Batch.forEach ${idx++}`)
                setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
            })
        }),
        _: (() => { idx = 0; globalThis.gc?.(); })(),

        'Concurrency.forEach': await Concurrency.forEach({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise<void>((resolve) => {
                console.log(`Concurrency.forEach ${idx++}`)
                setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
            })
        }),
        _1: (() => { idx = 0; globalThis.gc?.(); })(),

        'Promise.all(void)': await Promise.all(data.map(async item => new Promise<void>((resolve) => {
            console.log(`Promise.all(void) ${idx++}`)
            setTimeout(() => { item ** item + 1; resolve(); }, 400 + (idx * 50));
        }))),
        _2: (() => { idx = 0; globalThis.gc?.(); })(),

    };
    forEach;

};

run()
    .then(() => console.log('Done'))
    .catch(err => console.error(err));