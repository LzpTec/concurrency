import { EventEmitter } from '../src/event-emitter';

type Task<A, B> = (item: A) => Promise<B> | B;

export const oldBatchMap = async<A, B>(items: A[], batchSize: number, task: Task<A, B>): Promise<B[]> => {
    let position = 0;
    const results = new Array();
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results.push(...await Promise.all(itemsForBatch.map(item => task(item))));
        position += batchSize;
    }
    return results;
}

export const oldConcurrencyMap = async<A, B>(items: A[], maxConcurrency: number, task: Task<A, B>): Promise<B[]> => {
    const results = [];

    let error: any;

    const ev = new EventEmitter();
    let running = 0;

    for (const item of items) {
        if (error)
            throw error;

        results
            .push(
                Promise.resolve(task(item))
                    .catch(err => {
                        error = err;
                        return;
                    })
                    .finally(() => {
                        running--;
                        ev.emit('free');
                    })
            );

        running++;

        while (running >= maxConcurrency)
            await new Promise((resolve) => ev.once('free', resolve));
    }

    return Promise
        .all(results)
        .then(res => {
            if (error)
                throw error;

            const result: any = res;
            return result;
        })
        .finally(() => ev.removeAllListeners());
}

export const oldConcurrencyMapSettled = async<A, B>(items: A[], maxConcurrency: number, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> => {
    const results = [];

    const ev = new EventEmitter();
    let running = 0;

    for (const item of items) {
        results
            .push(
                Promise.resolve(task(item))
                    .then(result => ({ error: null, result }))
                    .catch(error => ({ error, result: null }))
                    .finally(() => {
                        running--;
                        ev.emit('free');
                    })
            );

        running++;

        while (running >= maxConcurrency)
            await new Promise((resolve) => ev.once('free', resolve));
    }

    return await Promise
        .all(results)
        .then(res => {
            const response: Array<any> = res
                .map(x => {
                    if (x.error)
                        return {
                            status: "rejected",
                            reason: x.error
                        }

                    return {
                        status: "fulfilled",
                        value: x.result
                    }
                });

            return response;
        })
        .finally(() => ev.removeAllListeners());
}

export const oldConcurrencyForEach = async <A>(items: A[], maxConcurrency: number, task: Task<A, void>): Promise<void> => {
    const results = [];
    let error: any;

    const ev = new EventEmitter();
    let running = 0;

    for (const item of items) {
        if (error)
            throw error;

        results
            .push(
                Promise.resolve(task(item))
                    .catch(err => {
                        error = err;
                        return;
                    })
                    .finally(() => {
                        running--;
                        ev.emit('free');
                    })
            );

        running++;

        while (running >= maxConcurrency)
            await new Promise((resolve) => ev.once('free', resolve));
    }

    return Promise
        .all(results)
        .then(() => {
            if (error)
                throw error;

            return;
        })
        .finally(() => ev.removeAllListeners());
}