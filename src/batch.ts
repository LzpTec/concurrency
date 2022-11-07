import { Queue } from './collections';
import { Event } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';
import type { Input, Job, Task } from './types';

const JOB_DONE = Symbol(`JobDone`);

export class Batch {
    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(items: Input<A>, batchSize: number, task: Task<A, B>): Promise<B[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: B[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    new Promise<void>((resolve, reject) =>
                        Promise
                            .resolve(iterator.next())
                            .then(res => {
                                if (!res.done)
                                    return res.value;

                                done = true;
                                return JOB_DONE;
                            })
                            .then(async res => {
                                if (res !== JOB_DONE)
                                    results[index] = await Promise.resolve(task(res!));

                                resolve();
                            })
                            .catch(err => reject(err))
                    )
                );

            if (p.length >= batchSize) {
                await Promise.all(p);
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Same as Promise.allSettled(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(items: Input<A>, batchSize: number, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: PromiseSettledResult<B>[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    new Promise<void>((resolve) =>
                        Promise
                            .resolve(iterator.next())
                            .then(res => {
                                if (!res.done)
                                    return res.value;

                                done = true;
                                return JOB_DONE;
                            })
                            .then(async res => {
                                if (res !== JOB_DONE)
                                    results[index] = { status: 'fulfilled', value: await Promise.resolve(task(res!)) };

                                resolve();
                            })
                            .catch(err => { results[index] = { status: 'rejected', reason: err } })
                    )
                );

            if (p.length >= batchSize) {
                await Promise.all(p);
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task<A, void>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    static async forEach<A>(items: Input<A>, batchSize: number, task: Task<A, void>): Promise<void> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    new Promise<void>((resolve, reject) =>
                        Promise
                            .resolve(iterator.next())
                            .then(res => {
                                if (!res.done)
                                    return res.value;

                                done = true;
                                return JOB_DONE;
                            })
                            .then(async res => {
                                if (res !== JOB_DONE)
                                    await Promise.resolve(task(res!));

                                resolve();
                            })
                            .catch(err => reject(err))
                    )
                );

            if (p.length >= batchSize) {
                await Promise.all(p);
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);
    }

    /**
     * TODO DESC
     *
     * @template A
     * @param {Input<A>} items Arguments to pass to the predicate for each call.
     * @param {number} batchSize
     * @param {Task<A, boolean>} predicate The filter method calls the predicate function one time for each element in the array.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(items: Input<A>, batchSize: number, predicate: Task<A, boolean>): Promise<A[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: A[] = new Array();

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    new Promise<void>((resolve, reject) =>
                        Promise
                            .resolve(iterator.next())
                            .then(res => {
                                if (!res.done)
                                    return res.value;

                                done = true;
                                return JOB_DONE;
                            })
                            .then(async res => {
                                if (res !== JOB_DONE) {
                                    const filter = await Promise.resolve(predicate(res!));

                                    if (filter)
                                        results.push(res);
                                }

                                resolve();
                            })
                            .catch(err => reject(err))
                    )
                );

            if (p.length >= batchSize) {
                await Promise.all(p);
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    #batchSize: number = 1;
    #currentRunning: number = 0;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    /**
     * 
     * @param {number} batchSize 
     */
    constructor(batchSize: number) {
        this.batchSize = batchSize;
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#queue.enqueue({ task, resolve, reject });
            this.#run();
        });
    }

    async #run() {
        await Promise.resolve();

        if (this.#currentRunning >= this.#batchSize)
            return;

        const jobs = new Array(this.#batchSize);
        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            jobs[this.#currentRunning] = Promise
                .resolve(job.task())
                .then(res => job.resolve(res))
                .catch(err => job.reject(err));

            this.#currentRunning++;
            if (this.#currentRunning >= this.#batchSize) {
                await Promise.all(jobs);
                this.#waitEvent.emit();
                this.#currentRunning = 0;
            }
        }
    }

    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    async map<A, B>(items: Input<A>, task: Task<A, B>): Promise<B[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: B[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    this.#runJob(() => Promise
                        .resolve(iterator.next())
                        .then(res => {
                            if (!res.done)
                                return res.value;

                            done = true;
                            return JOB_DONE;
                        })
                        .then(async res => {
                            if (res !== JOB_DONE)
                                results[index] = await Promise.resolve(task(res!));

                            return;
                        })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        };

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Same as Promise.allSettled(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    async mapSettled<A, B>(items: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: PromiseSettledResult<B>[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    this.#runJob(() => Promise
                        .resolve(iterator.next())
                        .then(res => {
                            if (!res.done)
                                return res.value;

                            done = true;
                            return JOB_DONE;
                        })
                        .then(async res => {
                            if (res !== JOB_DONE)
                                results[index] = {
                                    status: 'fulfilled',
                                    value: await Promise.resolve(task(res!))
                                };

                            return;
                        }).catch(err => {
                            results[index] = {
                                status: 'rejected',
                                reason: err
                            };
                        })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {Task<A, void>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    async forEach<A>(items: Input<A>, task: Task<A, void>): Promise<void> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    this.#runJob(() => Promise
                        .resolve(iterator.next())
                        .then(res => {
                            if (!res.done)
                                return res.value;

                            done = true;
                            return JOB_DONE;
                        })
                        .then(async res => {
                            if (res !== JOB_DONE)
                                await Promise.resolve(task(res!));

                            return;
                        })
                        .catch(err => { throw err; })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);
    }

    /**
     * TODO DESC
     *
     * @template A
     * @param {Input<A>} items Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The filter method calls the predicate function one time for each element in the array.
     * @returns {Promise<void>}
     */
    async filter<A>(items: Input<A>, predicate: Task<A, boolean>): Promise<A[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        const results: A[] = new Array();

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    this.#runJob(() => Promise
                        .resolve(iterator.next())
                        .then(res => {
                            if (!res.done)
                                return res.value;

                            done = true;
                            return JOB_DONE;
                        })
                        .then(async res => {
                            if (res !== JOB_DONE) {
                                const filter = await Promise.resolve(predicate(res!))
                                if (filter)
                                    results.push(res);
                            }

                            return;
                        })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    set batchSize(value: number) {
        if (typeof value !== 'number' || isNaN(value) || !Number.isInteger(value))
            throw new Error('Parameter batchSize invalid!');

        if (value < 1)
            throw new Error('Parameter batchSize must be at least 1!');

        this.#batchSize = value;
    }

}

Object.freeze(Batch);
