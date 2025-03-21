// TODO
import test from 'ava';
import { Chain } from '../../src/chain.js';
import { Batch } from '../../src/batch.js';

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const batch = new Batch({ batchSize: 2 });

test('map', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const chain = await new Chain(test())
        .map(async (value) => {
            await wait(value * 10);
            return value;
        })
        .runWith(batch);

    t.deepEqual(chain, [1, 2, 3, 4]);
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

    const chain = await new Chain(test())
        .mapSettled(async (value) => {
            await wait(value * 10);
            return value;
        })
        .runWith(batch);

    const result = chain.filter(x => x.status === 'fulfilled').map(x => x.value);
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
    await new Chain(test())
        .map(async (value) => {
            await wait(value * 10);
            calls.push(value);
        })
        .runWith(batch);

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
