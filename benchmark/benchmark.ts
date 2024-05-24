import { Batch, Concurrency } from '@lzptec/concurrency';
import colors from 'colors';
import pMap from 'p-map';
import { Bench } from 'tinybench';

const dataSize = 2048;
const batchSize = 8;
const maxConcurrency = 8;

const instanceData = Array.from({ length: dataSize }, (_, i) => i);
const fixedData = [...instanceData, ...instanceData];

const batchInstance = new Batch({
    batchSize
});
const concurrencyInstance = new Concurrency({
    maxConcurrency
});

const map = async (bench: Bench) => {
    bench
        .add(`Batch#map - ${fixedData.length} items - ${batchSize} items per batch`, async () => {
            const p1 = Batch.map({
                input: fixedData,
                batchSize,
                task: async (item) => new Promise<number>((resolve) => resolve(item))
            });

            await Promise.all([p1]);
        })
        .add(`Concurrency#map - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            const p1 = Concurrency.map({
                input: fixedData,
                maxConcurrency,
                task: async (item) => new Promise<number>((resolve) => resolve(item))
            });

            await Promise.all([p1]);
        })

        .add(`BatchInstance#map - ${instanceData.length * 2} items - ${batchSize} items per batch`, async () => {
            const p1 = batchInstance.map(instanceData, async (item) => new Promise<number>((resolve) => resolve(item)));
            const p2 = batchInstance.map(instanceData, async (item) => new Promise<number>((resolve) => resolve(item)));

            await Promise.all([p1, p2]);
        })
        .add(`ConcurrencyInstance#map - ${instanceData.length * 2} items - ${maxConcurrency} concurrently jobs`, async () => {
            const p1 = concurrencyInstance.map(instanceData, async (item) => new Promise<number>((resolve) => resolve(item)));
            const p2 = concurrencyInstance.map(instanceData, async (item) => new Promise<number>((resolve) => resolve(item)));

            await Promise.all([p1, p2]);
        })

        .add(`p-map - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            const p1 = pMap(fixedData, async (item) => new Promise<number>((resolve) => resolve(item)), { concurrency: maxConcurrency });

            await Promise.all([p1]);
        });

    await bench.run();
    printResults('map', bench);
};
map;

const mapSettled = async (bench: Bench) => {
    bench
        .add(`Batch#mapSettled - ${fixedData.length} items - ${batchSize} items per batch`, async () => {
            await Batch.mapSettled({
                input: fixedData,
                batchSize,
                task: async (item) => new Promise<number>((resolve) => resolve(item))
            });
        })
        .add(`Concurrency#mapSettled - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.mapSettled({
                input: fixedData,
                maxConcurrency,
                task: async (item) => new Promise<number>((resolve) => resolve(item))
            });
        })
        .add(`p-map - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(fixedData, async (item) => new Promise<number>((resolve) => resolve(item)), { concurrency: maxConcurrency, stopOnError: false });
        })

    await bench.run();
    printResults('mapSettled', bench);
};
mapSettled;

const forEach = async (bench: Bench) => {
    bench
        .add(`Batch#forEach - ${fixedData.length} items - ${batchSize} items per batch`, async () => {
            await Batch.forEach({
                input: fixedData,
                batchSize,
                task: async (item) => new Promise<void>((resolve) => {
                    (item); resolve();
                })
            });
        })
        .add(`Concurrency#forEach - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.forEach({
                input: fixedData,
                maxConcurrency,
                task: async (item) => new Promise<void>((resolve) => {
                    (item); resolve();
                })
            });
        })
        .add(`p-map - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(fixedData, async (item) => new Promise<void>((resolve) => {
                (item); resolve();
            }), { concurrency: maxConcurrency });
        })

    await bench.run();
    printResults('forEach', bench);
};
forEach;

const filterSymbol = Symbol();
const filter = async (bench: Bench) => {
    bench
        .add(`Batch#filter - ${fixedData.length} items - ${batchSize} items per batch`, async () => {
            await Batch.filter({
                input: fixedData,
                batchSize,
                predicate: async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0))
            });
        })
        .add(`Concurrency#filter - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.filter({
                input: fixedData,
                maxConcurrency,
                predicate: async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0))
            });
        })

        .add(`BatchInstance#filter - ${instanceData.length * 2} items - ${batchSize} items per batch`, async () => {
            const p1 = batchInstance.filter(instanceData, async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0)));
            const p2 = batchInstance.filter(instanceData, async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0)));

            await Promise.all([p1, p2]);
        })
        .add(`ConcurrencyInstance#filter - ${instanceData.length * 2} items - ${maxConcurrency} concurrently jobs`, async () => {
            const p1 = concurrencyInstance.filter(instanceData, async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0)));
            const p2 = concurrencyInstance.filter(instanceData, async (item) => new Promise<boolean>((resolve) => resolve(item % 2 === 0)));

            await Promise.all([p1, p2]);
        })

        .add(`p-map - Filter - ${fixedData.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(
                fixedData,
                async (item) => new Promise<number | symbol>((resolve) => resolve(item % 2 === 0 ? item : filterSymbol)),
                { concurrency: maxConcurrency }
            )
                .then(res => res.filter((x): x is number => x !== filterSymbol))
        });

    await bench.run();
    printResults('filter', bench);
};

const run = async () => {
    const bench = new Bench({
        iterations: 20,
        teardown: (task, mode) => {
            if (mode === 'warmup')
                return;

            console.log(colors.blue(`${task.name} ended!`));
        }
    });

    await map(bench);
    bench._tasks.clear();
    await mapSettled(bench);
    bench._tasks.clear();
    await forEach(bench);
    bench._tasks.clear();
    await filter(bench);
};

const printResults = (name: string, bench: Bench) => {
    console.group('\n' + colors.green(name + ' Results'));

    const fastest = bench.tasks.sort((x, y) => (y.result!.hz - x.result!.hz))[0];
    console.table(
        bench.tasks
            .map((task) => {
                const result = task.result!;
                return {
                    "Task Name": task.name,
                    "Operations per second": parseFloat(result.hz.toFixed(3)),
                    "Margin of error": parseFloat(result.moe.toFixed(2)),
                    "fastest": task === fastest ? `Yes` : `No`
                }
            })
    );
    console.groupEnd();
};

run();