import { Batch, Concurrency, Throttle } from '@lzptec/concurrency';
import { inspect } from 'util';

process.on('uncaughtException', (err) => console.error(err));
process.on('unhandledRejection', (err) => console.error(err));

const asyncData: { from: number; to: number } & AsyncIterable<number> = {
    from: 0,
    to: 15,

    [Symbol.asyncIterator]() {
        let current = this.from;
        let last = this.to;

        return {
            async next() {
                if (current <= last) {
                    return { done: false, value: current++ };
                } else {
                    return { done: true, value: undefined };
                }
            }
        };
    }
};

const data = Array.from({ length: 16 }, (_, idx) => idx);
Batch;
Concurrency;

const globalMaxConcurrency = 4;
const instanceMaxConcurrency = 4;
const globalBatchSize = 4;
const instanceBatchSize = 4;

const globalInterval = 1000;
// const instanceInterval = 1000;

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

    console.log(`-- Map --`);
    const map = {
        'RateLimit.map': await Throttle.map({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            interval: globalInterval,
            task: async (item) => new Promise((resolve) => {
                console.log(`RateLimit.map ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item * item + 1), 250);
            })
        }).then(() => idx = 0),

        'RateLimit.map(async)': await Throttle.map({
            input: asyncData,
            maxConcurrency: globalMaxConcurrency,
            interval: globalInterval,
            task: async (item) => new Promise((resolve) => {
                console.log(`RateLimit.map(async) ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item * item + 1), 250);
            })
        }).then(() => idx = 0),

        'Batch.map': await Batch.map({
            input: data,
            batchSize: globalBatchSize,
            task: async (item) => new Promise((resolve) => {
                console.log(`Batch.map ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Batch.map(async)': await Batch.map({
            input: asyncData,
            batchSize: globalBatchSize,
            task: async (item) => new Promise((resolve) => {
                console.log(`Batch.map(async) ${idx++} - Item ${item}`);
                setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'BatchInstance.map': await batchInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.map ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
        })).then(() => idx = 0),

        'BatchInstance.map(async)': await batchInstance.map(asyncData, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.map(async) ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
        })).then(() => idx = 0),

        'Concurrency.map': await Concurrency.map({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.map ${idx++}`)
                setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Concurrency.map(async)': await Concurrency.map({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.map(async) ${idx++}`)
                setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'ConcurrencyInstance.map': await concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.map ${idx++}`)
            setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
        })).then(() => idx = 0),

        'ConcurrencyInstance.map(async)': await concurrencyInstance.map(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.map(async) ${idx++}`)
            setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
        })).then(() => idx = 0),

        'Promise.all': await Promise.all(data.map(async item => new Promise((resolve) => {
            setTimeout(() => resolve(item * item + 1), 250 + (idx * 50));
        }))).then(() => idx = 0),
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
                setTimeout(() => resolve(item.toString()), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'BatchInstance.group': await batchInstance.group(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.group ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item.toString()), 250 + (idx * 50));
        })).then(() => idx = 0),

        'Concurrency.group': await Concurrency.group({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.group ${idx++}`)
                setTimeout(() => resolve(item.toString()), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'ConcurrencyInstance.group': await concurrencyInstance.group(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.group ${idx++}`)
            setTimeout(() => resolve(item.toString()), 250 + (idx * 50));
        })).then(() => idx = 0),
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
                setTimeout(() => resolve(item % 2 === 0), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'BatchInstance.filter': await batchInstance.filter(data, async (item) => new Promise((resolve) => {
            console.log(`BatchInstance.filter ${idx++} - Item ${item}`)
            setTimeout(() => resolve(item % 2 === 0), 250 + (idx * 50));
        })).then(() => idx = 0),

        'Concurrency.filter': await Concurrency.filter({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            predicate: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.filter ${idx++}`)
                setTimeout(() => resolve(item % 2 === 0), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'ConcurrencyInstance.filter': await concurrencyInstance.filter(data, async (item) => new Promise((resolve) => {
            console.log(`ConcurrencyInstance.filter ${idx++}`)
            setTimeout(() => resolve(item % 2 === 0), 250 + (idx * 50));
        })).then(() => idx = 0),

        'Promise.all': await Promise.all(data.map(async item => new Promise((resolve) => {
            setTimeout(() => resolve(item % 2 === 0 ? item : filterSymbol), 250 + (idx * 50));
        }))).then(res => res.filter((x): x is number => x !== filterSymbol)).then(() => idx = 0),
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
                setTimeout(() => resolve(item ** item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Concurrency.mapSettled': await Concurrency.mapSettled({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise((resolve) => {
                console.log(`Concurrency.mapSettled ${idx++}`)
                setTimeout(() => resolve(item ** item + 1), 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Promise.allSettled': await Promise.allSettled(data.map(async item => new Promise((resolve) => {
            console.log(`Promise.allSettled ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 250 + (idx * 50));
        }))).then(() => idx = 0),

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
                setTimeout(() => { item ** item + 1; resolve(); }, 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Concurrency.forEach': await Concurrency.forEach({
            input: data,
            maxConcurrency: globalMaxConcurrency,
            task: async (item) => new Promise<void>((resolve) => {
                console.log(`Concurrency.forEach ${idx++}`)
                setTimeout(() => { item ** item + 1; resolve(); }, 250 + (idx * 50));
            })
        }).then(() => idx = 0),

        'Promise.all(void)': await Promise.all(data.map(async item => new Promise<void>((resolve) => {
            console.log(`Promise.all(void) ${idx++}`)
            setTimeout(() => { item ** item + 1; resolve(); }, 250 + (idx * 50));
        }))).then(() => idx = 0),

    };
    forEach;

};

run()
    .then(() => console.log('Done'))
    .catch(err => console.error(err));