import { Queue } from './collections';
import { Event } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';
import type { ConcurrencyCommonOptions, ConcurrencyPredicateOptions, ConcurrencyTaskOptions } from './options';
import { interrupt, SharedBase } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Concurrency extends SharedBase {

    static #processGlobalTaskInput<A, B>(
        taskOptions: ConcurrencyTaskOptions<A, B>
    ): [AsyncIterator<A | Promise<A>> | Iterator<A | Promise<A>>, (() => Promise<void>) | undefined] {
        const input = taskOptions.input;

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

    static async #validatePredicate<A>(taskOptions: ConcurrencyPredicateOptions<A>) {
        const fieldType = typeof taskOptions.predicate;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`taskOptions.predicate(" + fieldType + ")\` to be a \`function\`");
    }

    /**
     * Performs the specified task for each element in the input, but it limits the concurrent execution to `maxConcurrency`.
     *
     * Same as Concurrency.map, But it doesn't store/return the results.
     * 
     * @template A
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: ConcurrencyTaskOptions<A, any>): Promise<void> {
        const [iterator, interval] = this.#processGlobalTaskInput(taskOptions);

        const wait = new Array(taskOptions.maxConcurrency);
        let isDone = false;

        for (let i = 0; i < taskOptions.maxConcurrency; i++)
            wait[i] = new Promise<void>(
                async (resolve, reject) => {
                    try {
                        do {
                            if (isDone)
                                break;

                            const item = await iterator.next();
                            if (item.done)
                                break;

                            const result = await taskOptions.task(await item.value);
                            if (result === interrupt) {
                                iterator.return?.();
                                isDone = true;
                                break;
                            }

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
     * @param {ConcurrencyTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await Concurrency.forEach({
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
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        const [iterator, interval] = this.#processGlobalTaskInput(taskOptions);

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
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A[]> {
        Concurrency.#validatePredicate(taskOptions);

        const results: A[] = new Array();

        await Concurrency.forEach({
            ...taskOptions,
            task: async (item) => {
                if (await taskOptions.predicate(item))
                    results.push(item);
            }
        });

        return results;
    }


    /**
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
        Concurrency.#validatePredicate(taskOptions);

        let result = false;

        await Concurrency
            .forEach({
                ...taskOptions,
                task: async (item) => {
                    if (await taskOptions.predicate(item)) {
                        result = true;
                        return interrupt;
                    }
                }
            });

        return result;
    }

    /**
     * Returns the value of the first element of `input` where `predicate` is true, and undefined otherwise.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A | undefined> {
        Concurrency.#validatePredicate(taskOptions);

        let result;

        await Concurrency
            .forEach({
                ...taskOptions,
                task: async (item) => {
                    if (await taskOptions.predicate(item)) {
                        result = item;
                        return interrupt;
                    }
                }
            });

        return result;
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
        Concurrency.#validatePredicate(taskOptions);

        let result = true;

        await Concurrency
            .forEach({
                ...taskOptions,
                task: async (item) => {
                    if (!(await taskOptions.predicate(item))) {
                        result = false;
                        return interrupt;
                    }
                }
            });

        return result;
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
        super();
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
                            iterator.return?.();
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
