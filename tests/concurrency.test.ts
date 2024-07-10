// TODO
import test from 'ava';
import { Concurrency } from '../src/concurrency';

const MAX_CONCURRENCY = 2;

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
    await Concurrency.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
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

    const calls = await Concurrency.map({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
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

    const calls = await Concurrency.mapSettled({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
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
    await Concurrency.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        task: async (value) => {
            await wait(value * 10);
            calls.push(value);
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
