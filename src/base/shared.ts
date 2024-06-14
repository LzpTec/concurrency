import type { Input, Task } from "./types";

export const interrupt = Symbol(`Interrupt`);
export const loop = Symbol(`loop`);

export function map<A, B>(results: B[], task: Task<A, B>) {
    return async function (item: A) {
        results.push(await task(item))
    };
}

export function mapSettled<A, B>(results: PromiseSettledResult<B>[], task: Task<A, B>) {
    return async function (item: A) {
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
    };
}

export function filter<A>(results: A[], predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item))
            results.push(item);
    };
}

export function some<A>(result: { value: boolean; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item)) {
            result.value = true;
            return interrupt;
        }
    };
}

export function find<A>(result: { value: A | undefined; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item)) {
            result.value = item;
            return interrupt;
        }
    };
}

export function every<A>(result: { value: boolean; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (!(await predicate(item))) {
            result.value = false;
            return interrupt;
        }
    };
}

export function group<A>(result: Map<string | symbol, A[]>, task: Task<A, string | symbol>) {
    return async function (item: A) {
        const group = await task(item);

        if (result.has(group))
            result.get(group)!.push(item);
        else
            result.set(group, [item]);
    };
}

export function isAsyncIterator<A>(input: any): input is AsyncIterable<A | Promise<A>>{
    return typeof input[Symbol.asyncIterator] === 'function';
}

export function isIterator<A>(input: any): input is Iterable<A | Promise<A>> {
    return typeof input[Symbol.iterator] === 'function';
}

export function validateInput<A>(input: Input<A>){
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

