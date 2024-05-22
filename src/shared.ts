import type { Task } from "./types";

export const interrupt = Symbol(`Interrupt`);

export const loop = Symbol(`loop`);

export const map = async <A, B>(results: B[], item: A, task: Task<A, B>) => {
    results.push(await task(item))
};

export const mapSettled = async <A, B>(results: PromiseSettledResult<B>[], item: A, task: Task<A, B>) => {
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

export const filter = async <A>(results: A[], item: A, predicate: Task<A, boolean>) => {
    if (await predicate(item))
        results.push(item);
};

export const some = async <A>(result: { value: boolean; }, item: A, predicate: Task<A, boolean>) => {
    if (await predicate(item)) {
        result.value = true;
        return interrupt;
    }
};

export const find = async <A>(result: { value: A | undefined; }, item: A, predicate: Task<A, boolean>) => {
    if (await predicate(item)) {
        result.value = item;
        return interrupt;
    }
};

export const every = async <A>(result: { value: boolean; }, item: A, predicate: Task<A, boolean>) => {
    if (!(await predicate(item))) {
        result.value = false;
        return interrupt;
    }
};

export const group = async <A>(result: Map<string | symbol, A[]>, item: A, task: Task<A, string | symbol>) => {
    const group = await task(item);

    if (result.has(group))
        result.get(group)!.push(item);
    else
        result.set(group, [item]);
};
