import { Queue } from './collections';
import { Event } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';
import type { ConcurrencyCommonOptions, ConcurrencyFilterOptions, ConcurrencyTaskOptions } from './options';
import type { Input, Job, RunnableTask, Task } from './types';

const interrupt = {};

export class Concurrency {

    static #processGlobalTaskInput<A, B>(
        input: Input<A>,
        taskOptions: ConcurrencyTaskOptions<A, B>
    ): [AsyncIterator<A | Promise<A>> | Iterator<A | Promise<A>>, (() => Promise<void>) | undefined] {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        if (typeof taskOptions.maxConcurrency !== 'number' || !Number.isInteger(taskOptions.maxConcurrency))
            throw new TypeError("Expected \`taskOptions.maxConcurrency(" + typeof taskOptions.maxConcurrency + ")\` to be a integer \`number\`");

        if (taskOptions.maxConcurrency < 1)
            throw new Error(`Parameter taskOptions.maxConcurrency must be at least 1, got ${taskOptions.maxConcurrency}!`);

        const fieldType = typeof taskOptions.task;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`taskOptions.task(" + fieldType + ")\` to be a \`function\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
        const interval = typeof taskOptions.concurrencyInterval === 'number' && !isNaN(taskOptions.concurrencyInterval) && taskOptions.concurrencyInterval > 0
            ? () => new Promise<void>((resolve) => setTimeout(() => resolve(), taskOptions.concurrencyInterval))
            : undefined;

        return [iterator, interval];
    }

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
        const [iterator, interval] = this.#processGlobalTaskInput(input, taskOptions);

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
        const [iterator, interval] = this.#processGlobalTaskInput(input, taskOptions);

        const results: PromiseSettledResult<B>[] = new Array();

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

        const fieldType = typeof taskOptions.predicate;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`taskOptions.predicate(" + fieldType + ")\` to be a \`function\`");

        await Concurrency.forEach(input, {
            ...taskOptions,
            task: async (item) => {
                if (await taskOptions.predicate(item))
                    results.push(item);
            }
        });

        return results;
    }

    #options: ConcurrencyCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    /**
     * 
     * @param {ConcurrencyCommonOptions} options 
     */
    constructor(options: ConcurrencyCommonOptions) {
        this.options = options;
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#queue.enqueue({ task, resolve, reject });
            this.#run();
        });
    }

    async #run() {
        await Promise.resolve();

        if (this.#currentRunning >= this.#options.maxConcurrency)
            return;

        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            this.#currentRunning++;

            await Promise.resolve(job.task())
                .then(res => { job.resolve(res); })
                .catch(err => { job.reject(err); });

            this.#currentRunning--;
            this.#waitEvent.emit();

            await new Promise<void>((resolve) => {
                if (typeof this.#options.concurrencyInterval === 'number' && this.#options.concurrencyInterval > 0)
                    return setTimeout(() => resolve(), this.#options.concurrencyInterval);

                return resolve();
            });
        }
    }

    #processTaskInput<A, B>(input: Input<A>, task: Task<A, B>) {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const fieldType = typeof task;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`task(" + fieldType + ")\` to be a \`function\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();

        return [iterator]
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
        const [iterator] = this.#processTaskInput(input, task);

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    this.#runJob(async () => {
                        const res = await iterator.next();
                        if (res.done) {
                            done = true;
                            return;
                        }

                        const result = await task(await res.value);
                        if (result === interrupt) {
                            done = true;
                            return;
                        }
                    })
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#options.maxConcurrency)
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
        const [iterator] = this.#processTaskInput(input, task);
        const results: PromiseSettledResult<B>[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    this.#runJob(async () => {
                        const res = await iterator.next();
                        if (res.done) {
                            done = true;
                            return;
                        }

                        results[index] = {
                            status: 'fulfilled',
                            value: await task(await res.value)
                        };
                    })
                        .catch(err =>
                            results[index] = {
                                status: 'rejected',
                                reason: err
                            }
                        )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#options.maxConcurrency)
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
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<void>}
     */
    async filter<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<A[]> {
        const fieldType = typeof predicate;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`predicate(" + fieldType + ")\` to be a \`function\`");

        const results: A[] = new Array();

        await this.forEach(input, async (item) => {
            if (await predicate(item))
                results.push(item);
        });

        return results;
    }

    /**
     * Determines whether the specified `predicate` function returns true for any element of an array.
     * 
     * @param input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<boolean>}
     */
    async some<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<boolean> {
        let result = false;

        await this
            .forEach(input, async (item) => {
                if (await predicate(item)) {
                    result = true;
                    return interrupt;
                }
            });

        return result;
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

    set options(options: ConcurrencyCommonOptions) {
        if (typeof options.maxConcurrency !== 'number' || !Number.isInteger(options.maxConcurrency))
            throw new Error('Parameter `maxConcurrency` invalid!');

        if (typeof options.concurrencyInterval === 'number') {
            if (isNaN(options.concurrencyInterval))
                throw new Error('Parameter `concurrencyInterval` invalid!');

            if (options.concurrencyInterval < 0)
                throw new Error('Parameter `concurrencyInterval` must be a positive number!');
        } else {
            options.concurrencyInterval = void 0;
        }

        this.#options = Object.assign({}, this.#options, options);
    }

}

Object.freeze(Concurrency);
