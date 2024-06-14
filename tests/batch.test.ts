import test from 'ava';
import { Batch } from '../src/batch';
import { Chain } from '../src/chain';

const BATCH_SIZE = 2;

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('Iterable', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls: number[] = [];
    await Batch.forEach({
        input: test(),
        batchSize: BATCH_SIZE,
        task: async (value) => {
            await wait(value * 10);
            calls.push(value);
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});

test('AsyncIterable', async t => {
    async function* test() {
        await wait(50);
        yield 1;
        await wait(50);
        yield 2;
        await wait(50);
        yield 3;
        await wait(50);
        yield 4;
        return;
    }

    const calls: number[] = [];
    await Batch.forEach({
        input: test(),
        batchSize: BATCH_SIZE,
        task: async (value) => {
            await wait(value * 10);
            calls.push(value);
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});

test('Chain', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const batch = new Batch({
        batchSize: BATCH_SIZE
    });

    const calls = await new Chain(test(), batch)
        .map(async (value) => {
            await wait(value * 10);
            return value;
        });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
