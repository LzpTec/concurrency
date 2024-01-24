// TODO
import test from 'ava';
import { Concurrency } from '../src/concurrency';

const MAX_CONCURRENCY = 2;

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
    await Concurrency.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        task: async (value) => {
            await wait(100);
            calls.push(value);
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});

test('AsyncIterable', async t => {
    async function* test() {
        await wait(100);
        yield 1;
        await wait(100);
        yield 2;
        await wait(100);
        yield 3;
        await wait(100);
        yield 4;
        return;
    }

    const calls: number[] = [];
    await Concurrency.forEach({
        input: test(),
        maxConcurrency: MAX_CONCURRENCY,
        task: (value) => {
            calls.push(value);
        }
    });

    t.deepEqual(calls, [1, 2, 3, 4]);
    t.pass();
});
