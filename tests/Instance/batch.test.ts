// TODO
import test from 'ava';
import { Batch } from '../../src/batch';
import { Chain } from '../../src/chain';

const BATCH_SIZE = 2;

const batch = new Batch({
    batchSize: BATCH_SIZE
});

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('run', async t => {
    const calls: number[] = [];

    for (let i = 1; i < 5; i++) {
        const value = i;
        await batch.run(async () => {
            await wait(value * 10);
            calls.push(value);
            return value;
        });
    }

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});

test('forEach', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls: number[] = [];
    await batch.forEach(test(), async (value) => {
        await wait(value * 10);
        calls.push(value);
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

    const calls = await batch.map(test(), async (value) => {
        await wait(value * 10);
        return value;
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

    const calls = await batch.mapSettled(test(), async (value) => {
        await wait(value * 10);
        return value;
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
    await batch.forEach(test(), async (value) => {
        await wait(value * 10);
        calls.push(value);
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
        })
        .get();

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
