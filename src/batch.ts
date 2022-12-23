import { Queue } from './collections';
import { Event } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';
import type { BatchCommonOptions, BatchFilterOptions, BatchTaskOptions } from './options';
import type { Input, Job, RunnableTask, Task } from './types';

const JOB_DONE = Symbol(`JobDone`);

export class Batch {

    static #validateTaskInput<A, B>(
        input: Input<A>,
        taskOptions: BatchTaskOptions<A, B>
    ): [AsyncIterator<A | Promise<A>> | Iterator<A | Promise<A>>, (() => Promise<void>) | undefined] {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        if (typeof taskOptions.batchSize !== 'number' || !Number.isInteger(taskOptions.batchSize))
            throw new TypeError("Expected \`taskOptions.batchSize(" + typeof taskOptions.batchSize + ")\` to be a integer \`number\`");

        if (taskOptions.batchSize < 1)
            throw new Error(`Parameter taskOptions.batchSize must be at least 1, got ${taskOptions.batchSize}!`);

        const fieldType = typeof taskOptions.task;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`taskOptions.task(" + fieldType + ")\` to be a \`function\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
        const interval = typeof taskOptions.batchInterval === 'number' && !isNaN(taskOptions.batchInterval) && taskOptions.batchInterval > 0
            ? () => new Promise<void>((resolve) => setTimeout(() => resolve(), taskOptions.batchInterval))
            : undefined;

        return [iterator, interval];
    }

    static async #runGlobalTask(
        task: (index: number) => Promise<boolean>,
        interval: (() => Promise<void>) | undefined,
        taskOptions: BatchTaskOptions<any, any>
    ) {
        const wait = new Array(taskOptions.batchSize);

        let idx = 0;
        let done = false;

        while (!done) {
            for (let i = 0; i < taskOptions.batchSize; i++) {
                const index = idx;
                idx++;

                wait[i] = Promise
                    .resolve(task(index))
                    .then((isDone) => done = isDone);
            }

            await Promise
                .all(wait);

            await interval?.();
        }
    }

    /**
     * Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * Same as Batch.map, But it doesn't store/return the results.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {BatchTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(input: Input<A>, taskOptions: BatchTaskOptions<A, any>): Promise<void> {
        const [iterator, interval] = this.#validateTaskInput(input, taskOptions);

        await this.#runGlobalTask(
            async () => {
                const res = await iterator.next();
                if (res.done)
                    return true;

                await taskOptions.task(await res.value);
                return false;
            },
            interval,
            taskOptions
        );
    }

    /**
     * Same as Promise.all, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(input: Input<A>, taskOptions: BatchTaskOptions<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await Batch.forEach(input, {
            ...taskOptions,
            task: async (item) => results.push(await taskOptions.task(item))
        });

        return results;
    }

    /**
     * Same as Promise.allSettled, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(input: Input<A>, taskOptions: BatchTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        const [iterator, interval] = this.#validateTaskInput(input, taskOptions);
        const results: PromiseSettledResult<B>[] = new Array();

        await this.#runGlobalTask(
            async (index) => {
                try {
                    const res = await iterator.next();
                    if (res.done)
                        return true;

                    results[index] = { status: 'fulfilled', value: await taskOptions.task(await res.value) };
                    return false;
                } catch (err) {
                    results[index] = { status: 'rejected', reason: err }
                    return false;
                }
            },
            interval,
            taskOptions
        );

        return results;
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function, but it search in batches.
     *
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the predicate for each call.
     * @param {BatchFilterOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(input: Input<A>, taskOptions: BatchFilterOptions<A>): Promise<A[]> {
        const results: A[] = new Array();

        const fieldType = typeof taskOptions.predicate;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`taskOptions.predicate(" + fieldType + ")\` to be a \`function\`");

        await Batch.forEach(input, {
            ...taskOptions,
            task: async (item) => {
                if (await taskOptions.predicate(item))
                    results.push(item);
            }
        });

        return results;
    }

    #options: BatchCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    /**
     * 
     * @param {BatchCommonOptions} options 
     */
    constructor(options: BatchCommonOptions) {
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

        if (this.#currentRunning >= this.#options.batchSize)
            return;

        const jobs = new Array();
        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            jobs[this.#currentRunning] = Promise
                .resolve(job.task())
                .then(res => job.resolve(res))
                .catch(err => job.reject(err));

            this.#currentRunning++;
            if (this.#currentRunning >= this.#options.batchSize) {
                await Promise.all(jobs);

                await new Promise<void>((resolve) => {
                    if (typeof this.#options.batchInterval === 'number' && this.#options.batchInterval > 0)
                        return setTimeout(() => resolve(), this.#options.batchInterval);

                    return resolve();
                });

                this.#waitEvent.emit();
                this.#currentRunning = 0;
            }
        }
    }

    /**
     * Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * Same as map, But it doesn't store/return the results.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, void>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    async forEach<A>(input: Input<A>, task: Task<A, void>): Promise<void> {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();

        let p = [];
        let done = false;

        let error: any;
        while (!done) {
            if (error)
                throw error;

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
                                await task(res);
                        })
                        .catch(err => error = err)
                    )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#options.batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);
    }

    /**
     * Same as Promise.all, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    async map<A, B>(input: Input<A>, task: Task<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await this.forEach(input, async (item) => {
            results.push(await task(item));
        });

        return results;
    }

    /**
     * Same as Promise.allSettled, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    async mapSettled<A, B>(input: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
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
                            if (res !== JOB_DONE)
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
            if (this.#currentRunning >= this.#options.batchSize) {
                await this.#waitEvent.once();
                p = [];
            }
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function, but it search in batches.
     *
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The filter method calls the predicate function one time for each element in the array.
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
     * @template A Input Type.
     * @template B Output Type.
     * @param {RunnableTask<A, B>} task Arguments to pass to the task for each call.
     * @param {A[]} [args] The task to run for each item.
     * @returns {Promise<B>}
     */
    async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        return await this.#runJob(() => Promise.resolve(task(...args)));
    }

    set options(options: BatchCommonOptions) {
        if (typeof options.batchSize !== 'number' || !Number.isInteger(options.batchSize))
            throw new Error('Parameter `batchSize` invalid!');

        if (typeof options.batchInterval === 'number') {
            if (isNaN(options.batchInterval))
                throw new Error('Parameter `batchInterval` invalid!');

            if (options.batchInterval < 0)
                throw new Error('Parameter `batchInterval` must be a positive number!');
        } else {
            options.batchInterval = void 0;
        }

        Object.assign(this.#options, options);
    }

}

Object.freeze(Batch);
