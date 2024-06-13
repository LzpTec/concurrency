import type { Task } from "./types";

export const interrupt = Symbol(`Interrupt`);

export const loop = Symbol(`loop`);

export function map<A, B>(results: B[], task: Task<A, B>) {
    return async function (item: A) {
        results.push(await task(item))
    };
};

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
};

export function filter<A>(results: A[], predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item))
            results.push(item);
    };
};

export function some<A>(result: { value: boolean; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item)) {
            result.value = true;
            return interrupt;
        }
    };
};

export function find<A>(result: { value: A | undefined; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (await predicate(item)) {
            result.value = item;
            return interrupt;
        }
    };
};

export function every<A>(result: { value: boolean; }, predicate: Task<A, boolean>) {
    return async function (item: A) {
        if (!(await predicate(item))) {
            result.value = false;
            return interrupt;
        }
    };
};

export function group<A>(result: Map<string | symbol, A[]>, task: Task<A, string | symbol>) {
    return async function (item: A) {
        const group = await task(item);

        if (result.has(group))
            result.get(group)!.push(item);
        else
            result.set(group, [item]);
    };
};
