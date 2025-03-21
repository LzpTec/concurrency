import type { Input, Task } from "./types.js";

export const interrupt = Symbol(`Interrupt`);
export const loop = Symbol(`loop`);

type SharedFnReturn<A, B> = {
    task: (item: A) => Promise<void | symbol>;
    results: B[];
};

type GroupKey = string | symbol;

export function forEach<A>(task: Task<A, void>): SharedFnReturn<A, void> {
    return {
        task: async function (item: A) { await task(item) },
        results: []
    }
}

export function map<A, B>(task: Task<A, B>): SharedFnReturn<A, B> {
    const results: B[] = new Array();
    return {
        task: async function (item: A) {
            results.push(await task(item))
        },
        results
    }
}

export function mapSettled<A, B>(task: Task<A, B>): SharedFnReturn<A, PromiseSettledResult<B>> {
    const results: PromiseSettledResult<B>[] = new Array();
    return {
        task: async function (item: A) {
            try {
                results.push({
                    status: 'fulfilled',
                    value: await task(item)
                });
            } catch (err) {
                results.push({
                    status: 'rejected',
                    reason: err
                });
            }
        },
        results
    }
}

export function filter<A>(predicate: Task<A, boolean>): SharedFnReturn<A, A> {
    const results: A[] = new Array();
    return {
        task: async function (item: A) {
            if (await predicate(item))
                results.push(item);
        },
        results
    }
}

export function some<A>(predicate: Task<A, boolean>): SharedFnReturn<A, boolean> {
    const results: boolean[] = [false];
    return {
        task: async function (item: A) {
            if (await predicate(item)) {
                results[0] = true;
                return interrupt;
            }
        },
        results
    }
}

export function find<A>(predicate: Task<A, boolean>): SharedFnReturn<A, A> {
    const results: A[] = [];
    return {
        task: async function (item: A) {
            if (await predicate(item)) {
                results[0] = item;
                return interrupt;
            }
        },
        results
    }
}

export function every<A>(predicate: Task<A, boolean>): SharedFnReturn<A, boolean> {
    const results: boolean[] = [true];
    return {
        task: async function (item: A) {
            if (!(await predicate(item))) {
                results[0] = false;
                return interrupt;
            }
        },
        results
    };
}

export function group<A>(task: Task<A, GroupKey>): SharedFnReturn<A, Map<GroupKey, A[]>> {
    const result = new Map<GroupKey, A[]>();
    return {
        task: async function (item: A) {
            const group = await task(item);

            if (result.has(group))
                result.get(group)!.push(item);
            else
                result.set(group, [item]);
        },
        results: [result]
    };
}

export function isAsyncIterator<A>(input: any): input is AsyncIterable<A | Promise<A>> {
    return typeof input[Symbol.asyncIterator] === 'function';
}

export function isIterator<A>(input: any): input is Iterable<A | Promise<A>> {
    return typeof input[Symbol.iterator] === 'function';
}

export function validateInput<A>(input: Input<A>) {
    const isAsync = isAsyncIterator<A>(input);
    const isSync = isIterator<A>(input);

    if (!isAsync && !isSync)
        throw new TypeError("Expected `input(" + typeof input + ")` to be an `Iterable` or `AsyncIterable`");
}

export function validateAndProcessInput<A>(input: Input<A>) {
    const isAsync = isAsyncIterator<A>(input);
    const isSync = isIterator<A>(input);

    if (!isAsync && !isSync)
        throw new TypeError("Expected `input(" + typeof input + ")` to be an `Iterable` or `AsyncIterable`");

    if (isAsync) {
        return input[Symbol.asyncIterator]();
    }

    return input[Symbol.iterator]();
}

export function validateTask<A, B>(task: Task<A, B>) {
    const fieldType = typeof task;
    if (fieldType !== 'function')
        throw new TypeError("Expected `task(" + fieldType + ")` to be a `function`");
}

export function validatePredicate<A>(predicate: Task<A, boolean>) {
    const fieldType = typeof predicate;
    if (fieldType !== 'function')
        throw new TypeError("Expected `predicate(" + fieldType + ")` to be a `function`");
}

