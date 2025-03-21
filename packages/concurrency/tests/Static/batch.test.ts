// TODO
import test from 'ava';
import { Batch } from '../../src/batch.js';

const BATCH_SIZE = 2;

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('forEach', async t => {
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

test('map', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls = await Batch.map({
        input: test(),
        batchSize: BATCH_SIZE,
        task: async (value) => {
            await wait(value * 10);
            return value;
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});

test('mapSettled', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls = await Batch.mapSettled({
        input: test(),
        batchSize: BATCH_SIZE,
        task: async (value) => {
            await wait(value * 10);
            return value;
        }
    });

    const result = calls.filter(x => x.status === 'fulfilled').map(x => x.value);
    t.deepEqual(result, [1, 2, 3, 4]);
    t.pass();
});

test('AsyncIterable', async t => {
    async function* test() {
        await wait(25);
        yield 1;
        await wait(25);
        yield 2;
        await wait(25);
        yield 3;
        await wait(25);
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
