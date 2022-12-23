import { Batch, Concurrency } from '@lzptec/concurrency';
import colors from 'colors';
import pMap from 'p-map';
import { Bench } from 'tinybench';

const dataSize = 32;
const batchSize = 4;
const maxConcurrency = 4;

const data = Array.from({ length: dataSize }, (_, i) => i);

let idx = 0;

const batchInstance = new Batch({
    batchSize
});
const concurrencyInstance = new Concurrency({
    maxConcurrency
});

const map = async (bench: Bench) => {
    bench
        .add(`Batch#map - ${data.length} items - ${batchSize} items per batch`, async () => {
            await Batch.map(data, {
                batchSize,
                task: async (item) => new Promise<number>((resolve) => {
                    setTimeout(() => resolve(item + 1), 5 + (idx * 5));
                })
            });
        })
        .add(`Concurrency#map - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.map(data, {
                maxConcurrency,
                task: async (item) => new Promise<number>((resolve) => {
                    setTimeout(() => resolve(item + 1), 5 + (idx * 5));
                })
            });
        })

        .add(`BatchInstance#map - ${data.length} items - ${batchSize} items per batch`, async () => {
            await batchInstance.map(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 5 + (idx * 5));
            }));
        })
        .add(`ConcurrencyInstance#map - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await concurrencyInstance.map(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 5 + (idx * 5));
            }));
        })

        .add(`p-map - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 5 + (idx * 5));
            }), { concurrency: maxConcurrency });
        });

    await bench.run();
    printResults('map', bench);
};
map;

const mapSettled = async (bench: Bench) => {
    bench
        .add(`Batch#mapSettled - ${data.length} items - ${batchSize} items per batch`, async () => {
            await Batch.mapSettled(data, {
                batchSize,
                task: async (item) => new Promise<number>((resolve) => {
                    setTimeout(() => resolve(item + 1), 5 + (idx * 5));
                })
            });
        })
        .add(`Concurrency#mapSettled - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.mapSettled(data, {
                maxConcurrency,
                task: async (item) => new Promise<number>((resolve) => {
                    setTimeout(() => resolve(item + 1), 5 + (idx * 5));
                })
            });
        })
        .add(`p-map - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 5 + (idx * 5));
            }), { concurrency: maxConcurrency, stopOnError: false });
        })

    await bench.run();
    printResults('mapSettled', bench);
};
mapSettled;

const forEach = async (bench: Bench) => {
    bench
        .add(`Batch#forEach - ${data.length} items - ${batchSize} items per batch`, async () => {
            await Batch.forEach(data, {
                batchSize,
                task: async (item) => new Promise<void>((resolve) => {
                    setTimeout(() => { item + 1; resolve() }, 5 + (idx * 5));
                })
            });
        })
        .add(`Concurrency#forEach - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.forEach(data, {
                maxConcurrency,
                task: async (item) => new Promise<void>((resolve) => {
                    setTimeout(() => { item + 1; resolve() }, 5 + (idx * 5));
                })
            });
        })
        .add(`p-map - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(data, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 5 + (idx * 5));
            }), { concurrency: maxConcurrency });
        })

    await bench.run();
    printResults('forEach', bench);
};
forEach;

const filterSymbol = Symbol();
const filter = async (bench: Bench) => {
    bench
        .add(`Batch#filter - ${data.length} items - ${batchSize} items per batch`, async () => {
            await Batch.filter(data, {
                batchSize,
                predicate: async (item) => new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(item % 2 === 0), 5 + (idx * 5));
                })
            });
        })
        .add(`Concurrency#filter - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await Concurrency.filter(data, {
                maxConcurrency,
                predicate: async (item) => new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(item % 2 === 0), 5 + (idx * 5));
                })
            });
        })

        .add(`BatchInstance#filter - ${data.length} items - ${batchSize} items per batch`, async () => {
            await batchInstance.filter(data, async (item) => new Promise<boolean>((resolve) => {
                setTimeout(() => resolve(item % 2 === 0), 5 + (idx * 5));
            }));
        })
        .add(`ConcurrencyInstance#filter - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await concurrencyInstance.filter(data, async (item) => new Promise<boolean>((resolve) => {
                setTimeout(() => resolve(item % 2 === 0), 5 + (idx * 5));
            }));
        })

        .add(`p-map - Filter - ${data.length} items - ${maxConcurrency} concurrently jobs`, async () => {
            await pMap(data, async (item) => new Promise<number | symbol>((resolve) => {
                setTimeout(() => resolve(item % 2 === 0 ? item : filterSymbol), 5 + (idx * 5));
            }), { concurrency: maxConcurrency }).then(res => res.filter((x): x is number => x !== filterSymbol))
        });

    await bench.run();
    printResults('filter', bench);
};

const run = async () => {
    const bench = new Bench({
        iterations: 20,
        teardown: (task, mode) => {
            idx = 0;

            if (mode === 'warmup')
                return;

            console.log(colors.blue(`${task.name} ended!`));
            globalThis.gc?.();
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