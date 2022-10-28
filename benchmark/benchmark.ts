import { Batch, Concurrency } from '@lzptec/concurrency';
import colors from 'colors';
import pMap from 'p-map';
import { Bench } from 'tinybench';
import { oldBatchMap, oldConcurrencyForEach, oldConcurrencyMap, oldConcurrencyMapSettled } from './old';

const data = Array.from({ length: 16 }, (_, i) => i);
let idx = 0;

const map = async (bench: Bench) => {
    bench
        .add('Batch#map - 4', async () => {
            await Batch.map(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Batch#oldBatchMap - 4', async () => {
            await oldBatchMap(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#newMap - 4', async () => {
            await Concurrency.map(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#oldMap - 4', async () => {
            await oldConcurrencyMap(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('p-map - 4', async () => {
            await pMap(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }), { concurrency: 4 });
        })

    await bench.run();
    printResults('map', bench);

}

const mapSettled = async (bench: Bench) => {
    bench
        .add('Batch#mapSettled - 4', async () => {
            await Batch.mapSettled(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#mapSettled - 4', async () => {
            await Concurrency.mapSettled(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#oldMapSettled - 4', async () => {
            await oldConcurrencyMapSettled(data, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('p-map - 4', async () => {
            await pMap(data, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }), { concurrency: 4, stopOnError: false });
        })

    await bench.run();
    printResults('mapSettled', bench);
}

const forEach = async (bench: Bench) => {
    bench
        .add('Batch#forEach - 4', async () => {
            await Batch.forEach(data, 4, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }));
        })
        .add('Concurrency#forEach - 4', async () => {
            await Concurrency.forEach(data, 4, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }));
        })
        .add('Concurrency#oldConcurrencyForEach - 4', async () => {
            await oldConcurrencyForEach(data, 4, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }));
        })
        .add('p-map - 4', async () => {
            await pMap(data, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }), { concurrency: 4 });
        })

    await bench.run();
    printResults('forEach', bench);
}

const run = async () => {
    const bench = new Bench({
        iterations: 20,
        teardown: (task, mode) => {
            idx = 0;

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
}

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