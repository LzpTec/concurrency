import { Queue } from './collections';
import { Event } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';
import type { ConcurrencyCommonOptions, ConcurrencyFilterOptions, ConcurrencyTaskOptions } from './options';
import type { Input, Job, RunnableTask, Task } from './types';

const JOB_DONE = Symbol(`JobDone`);

export class Concurrency {
    /**
     * Performs the specified task for each element in the input, but it limits the concurrent execution to `maxConcurrency`.
     *
     * Same as Concurrency.map, But it doesn't store/return the results.
     * 
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(input: Input<A>, taskOptions: ConcurrencyTaskOptions<A, any>): Promise<void> {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        if (typeof taskOptions.maxConcurrency !== 'number' || !Number.isInteger(taskOptions.maxConcurrency))
            throw new TypeError("Expected \`taskOptions.maxConcurrency(" + typeof taskOptions.maxConcurrency + ")\` to be a integer \`number\`");

        if (taskOptions.maxConcurrency < 1)
            throw new Error(`Parameter taskOptions.maxConcurrency must be at least 1, got ${taskOptions.maxConcurrency}!`);

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
        const interval = typeof taskOptions.concurrencyInterval === 'number' && !isNaN(taskOptions.concurrencyInterval) && taskOptions.concurrencyInterval > 0
            ? () => new Promise<void>((resolve) => setTimeout(() => resolve(), taskOptions.concurrencyInterval))
            : undefined;

        const wait = new Array(taskOptions.maxConcurrency);
        for (let i = 0; i < taskOptions.maxConcurrency; i++)
            wait[i] = new Promise<void>(
                async (resolve, reject) => {
                    try {
                        do {
                            const item = await iterator.next();
                            if (item.done) break;

                            await taskOptions.task(await item.value);
                            await interval?.();
                        } while (true);

                        resolve();
                    } catch (err) {
                        reject(err);
                        return;
                    }
                }
            );

        await Promise
            .all(wait);
    }

    /**
     * Same as Promise.all, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(input: Input<A>, taskOptions: ConcurrencyTaskOptions<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await Concurrency.forEach(input, {
            ...taskOptions,
            task: async (item) => results.push(await taskOptions.task(item))
        });

        return results;
    }

    /**
     * Same as Promise.allSettled, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(input: Input<A>, taskOptions: ConcurrencyTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        if (typeof taskOptions.maxConcurrency !== 'number' || !Number.isInteger(taskOptions.maxConcurrency))
            throw new TypeError("Expected \`taskOptions.maxConcurrency(" + typeof taskOptions.maxConcurrency + ")\` to be a integer \`number\`");

        if (taskOptions.maxConcurrency < 1)
            throw new Error(`Parameter taskOptions.maxConcurrency must be at least 1, got ${taskOptions.maxConcurrency}!`);

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
        const results: PromiseSettledResult<B>[] = new Array();
        const interval = typeof taskOptions.concurrencyInterval === 'number' && !isNaN(taskOptions.concurrencyInterval) && taskOptions.concurrencyInterval > 0
            ? () => new Promise<void>((resolve) => setTimeout(() => resolve(), taskOptions.concurrencyInterval))
            : undefined;

        let idx = 0;

        const wait = new Array(taskOptions.maxConcurrency);
        for (let i = 0; i < taskOptions.maxConcurrency; i++)
            wait[i] = new Promise<void>(
                async (resolve) => {
                    do {
                        const index = idx;
                        idx++;

                        try {
                            const item = await iterator.next();
                            if (item.done) break;

                            results[index] = {
                                status: 'fulfilled',
                                value: await taskOptions.task(await item.value)
                            };
                        } catch (err) {
                            results[index] = {
                                status: 'rejected',
                                reason: err
                            };
                        }
                        await interval?.();
                    } while (true);

                    resolve();
                }
            );

        return await Promise
            .all(wait)
            .then(() => results);
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @param {Input<A>} input Arguments to pass to the predicate for each call.
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(input: Input<A>, taskOptions: ConcurrencyFilterOptions<A>): Promise<A[]> {
        const results: A[] = new Array();

        await Concurrency.forEach(input, {
            ...taskOptions,
            task: async (item) => {
                if (await taskOptions.predicate(item))
                    results.push(item);
            }
        });

        return results;
    }

    #maxConcurrency: number = 1;
    #currentRunning: number = 0;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    /**
     * 
     * @param {ConcurrencyCommonOptions} options 
     */
    constructor(options: ConcurrencyCommonOptions) {
        this.maxConcurrency = options.maxConcurrency;
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#queue.enqueue({ task, resolve, reject });
            this.#run();
        });
    }

    async #run() {
        await Promise.resolve();

        if (this.#currentRunning >= this.#maxConcurrency)
            return;

        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            this.#currentRunning++;

            await Promise.resolve(job.task())
                .then(res => { job.resolve(res); })
                .catch(err => { job.reject(err); });

            this.#currentRunning--;
            this.#waitEvent.emit();
            await Promise.resolve();
        }
    }

    /**
     * Performs the specified task for each element in the input, but it limits the concurrent execution to `maxConcurrency`.
     *
     * Same as map, But it doesn't store/return the results.
     * 
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, any>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    async forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();

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
                            if (res === JOB_DONE)
                                return;

                            await task(res);
                        })
                        .catch(err => { throw err; })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#maxConcurrency)
                await this.#waitEvent.once();
        }

        if (p.length > 0)
            await Promise.all(p);
    }

    /**
     * Same as Promise.all, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    async map<A, B>(input: A[], task: Task<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await this.forEach(input, async (item) => results.push(await task(item)));

        return results;
    }

    /**
     * Same as Promise.allSettled, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    async mapSettled<A, B>(input: A[], task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
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
                            if (res === JOB_DONE)
                                return;

                            results[index] = {
                                status: 'fulfilled',
                                value: await task(res)
                            };
                        })
                        .catch(err => {
                            results[index] = {
                                status: 'rejected',
                                reason: err
                            };
                        })
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#maxConcurrency)
                await this.#waitEvent.once();
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function, but it limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, void>} predicate The task to run for each item.
     * @returns {Promise<void>}
     */
    async filter<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<A[]> {
        const results: A[] = new Array();

        await this.forEach(input, async (item) => {
            if (await predicate(item))
                results.push(item);
        });

        return results;
    }

    /**
     * Performs a specified task.
     *
     * @template A
     * @template B
     * @param {RunnableTask<A, B>} task Arguments to pass to the task for each call.
     * @param {A[]} [args] The task to run for each item.
     * @returns {Promise<B>}
     */
    async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        return await this.#runJob(() => Promise.resolve(task(...args)));
    }

    set maxConcurrency(value: number) {
        if (typeof value !== 'number' || isNaN(value) || !Number.isInteger(value))
            throw new Error('Parameter maxConcurrency invalid!');

        if (value < 1)
            throw new Error('Parameter maxConcurrency must be at least 1!');

        this.#maxConcurrency = value;
    }

}

Object.freeze(Concurrency);
