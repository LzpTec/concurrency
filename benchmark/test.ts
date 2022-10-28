import { Batch, Concurrency } from '@lzptec/concurrency';
import { oldConcurrencyMap, oldConcurrencyMapSettled } from './old';

const data = Array.from({ length: 20 }, () => Math.floor(Math.random() * 7));
Batch;
Concurrency;



const run = async () => {
    let idx = 0;

    const map = {
        'Batch.map 4': await Batch.map(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Batch.map ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 500 + (idx * 50));
        })),
        _: idx = 0,

        'Concurrency.map 4': await Concurrency.map(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Concurrency.map ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 500 + (idx * 50));
        })),
        _1: idx = 0,

        'Concurrency.oldMap 4': await oldConcurrencyMap(data, 4, async (item) => new Promise((resolve) => {
            console.log(`Concurrency.oldMap ${idx++}`)
            setTimeout(() => resolve(item ** item + 1), 500 + (idx * 50));
        })),
        _2: idx = 0,

        'Promise.all': await Promise.all(data.map(async item => new Promise((resolve) => {
            setTimeout(() => resolve(item ** item + 1), 500 + (idx * 50));
        }))),
    };
    console.log(map)

    const mapSettled = {
        'Batch.mapSettled 4': await Batch.mapSettled(data, 4, async (item) => Math.round(item ** item + 1)),

        'Concurrency.mapSettled 4': await Concurrency.mapSettled(data, 4, async (item) => Math.round(item ** item + 1)),

        'Concurrency.oldMapSettled 4': await oldConcurrencyMapSettled(data, 4, async (item) => Math.round(item ** item + 1)),

        'Promise.allSettled': await Promise.allSettled(data.map(async item => Math.round(item ** item + 1))),
    };
    console.log(mapSettled)

    const forEach = {
        'Batch.forEach 4': await Batch.forEach(data, 4, async (item) => { Math.round(item ** item + 1) }),
        'Concurrency.forEach 4': await Concurrency.forEach(data, 4, async (item) => { Math.round(item ** item + 1) }),
        'Promise.all': await Promise.all(data.map(async item => { Math.round(item ** item + 1) })).then(() => { }),
    }
    console.log(forEach);

};

run()
    .then(() => console.log('Done'))
    .catch(err => console.error(err));