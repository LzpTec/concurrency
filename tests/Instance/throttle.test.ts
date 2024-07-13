// TODO
import test from 'ava';
import { Throttle } from '../../src/throttle';

const MAX_CONCURRENCY = 2;
const INTERVAL = 200;

const throttle = new Throttle({
    interval: INTERVAL,
    maxConcurrency: MAX_CONCURRENCY
});

test('run', async t => {
    const calls: number[] = [];

    for (let i = 1; i < 5; i++) {
        const value = i;
        await throttle.run(async () => {
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
    await throttle.forEach(test(), async (value) => {
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

    const calls = await throttle.map(test(), async (value) => {
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

    const calls = await throttle.mapSettled(test(), async (value) => {
        return value;
    })

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
    await throttle.forEach(test(), async (value) => {
        calls.push(value);
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
