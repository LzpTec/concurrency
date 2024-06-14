// TODO
import test from 'ava';
import { Throttle } from '../src/throttle';
import { Chain } from '../src/chain';

const MAX_CONCURRENCY = 2;
const INTERVAL = 500;

test('Iterable', async t => {
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
