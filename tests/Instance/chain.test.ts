// TODO
import test from 'ava';
import { Chain } from '../../src/chain';
import { Batch } from '../../src/batch';

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('map', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const chain = new Chain(test(), new Batch({ batchSize: 2 }));

    const calls = await chain.map(async (value) => {
        await wait(value * 10);
        return value;
    }).get();

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

    const chain = new Chain(test(), new Batch({ batchSize: 2 }));

    const calls = await chain.mapSettled(async (value) => {
        await wait(value * 10);
        return value;
    }).get();

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

    const chain = new Chain(test(), new Batch({ batchSize: 2 }));
    const calls: number[] = [];
    await chain.map(async (value) => {
        await wait(value * 10);
        calls.push(value);
    }).get();

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
