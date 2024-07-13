// TODO
import test from 'ava';
import { Chain } from '../../src/chain';
import { Throttle } from '../../src/throttle';

const MAX_CONCURRENCY = 2;
const INTERVAL = 500;

test('forEach', async t => {
    function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls: number[] = [];
    await Throttle.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        interval: INTERVAL,
        task: async (value) => {
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

    const calls = await Throttle.map({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        interval: INTERVAL,
        task: async (value) => {
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

    const calls = await Throttle.mapSettled({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        interval: INTERVAL,
        task: async (value) => {
            return value;
        }
    });

    const result = calls.filter(x => x.status === 'fulfilled').map(x => x.value);
    t.deepEqual(result, [1, 2, 3, 4]);
    t.pass();
});

test('AsyncIterable', async t => {
    async function* test() {
        yield 1;
        yield 2;
        yield 3;
        yield 4;
        return;
    }

    const calls: number[] = [];
    await Throttle.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        interval: INTERVAL,
        task: async (value) => {
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

    const throttle = new Throttle({
        maxConcurrency: MAX_CONCURRENCY,
        interval: INTERVAL
    });

    const calls = await new Chain(test(), throttle)
        .map(async (value) => {
            return value;
        });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
