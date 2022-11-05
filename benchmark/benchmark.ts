import { Batch, Concurrency } from '@lzptec/concurrency';
import colors from 'colors';
import pMap from 'p-map';
import { Bench } from 'tinybench';

const data32 = Array.from({ length: 32 }, (_, i) => i);

let idx = 0;

const batchInstance = new Batch(4);
const concurrencyInstance = new Concurrency(4);

const map = async (bench: Bench) => {
    bench
        .add('Batch#map - 32 items - 4 items per batch', async () => {
            await Batch.map(data32, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#map - 32 items - 4 concurrently jobs', async () => {
            await Concurrency.map(data32, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })

        .add('BatchInstance#map - 32 items - 4 items per batch', async () => {
            await batchInstance.map(data32, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('ConcurrencyInstance#map - 32 items - 4 concurrently jobs', async () => {
            await concurrencyInstance.map(data32, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })

        .add('p-map - 32 items - 4 concurrently jobs', async () => {
            await pMap(data32, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }), { concurrency: 4 });
        });

    await bench.run();
    printResults('map', bench);

}

const mapSettled = async (bench: Bench) => {
    bench
        .add('Batch#mapSettled - 32 items - 4 items per batch', async () => {
            await Batch.mapSettled(data32, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('Concurrency#mapSettled - 32 items - 4 concurrently jobs', async () => {
            await Concurrency.mapSettled(data32, 4, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }));
        })
        .add('p-map - 32 items - 4 concurrently jobs', async () => {
            await pMap(data32, async (item) => new Promise<number>((resolve) => {
                setTimeout(() => resolve(item + 1), 10 + (idx * 5));
            }), { concurrency: 4, stopOnError: false });
        })

    await bench.run();
    printResults('mapSettled', bench);
}

const forEach = async (bench: Bench) => {
    bench
        .add('Batch#forEach - 32 items - 4 items per batch', async () => {
            await Batch.forEach(data32, 4, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }));
        })
        .add('Concurrency#forEach - 32 items - 4 concurrently jobs', async () => {
            await Concurrency.forEach(data32, 4, async (item) => new Promise<void>((resolve) => {
                setTimeout(() => { item + 1; resolve() }, 10 + (idx * 5));
            }));
        })
        .add('p-map - 32 items - 4 concurrently jobs', async () => {
            await pMap(data32, async (item) => new Promise<void>((resolve) => {
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
            globalThis.gc?.();
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