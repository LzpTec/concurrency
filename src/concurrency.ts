import { EventEmitter } from './event-emitter';
import { isAsyncIterator, isIterator } from './guards';

/**
 * @template A
 * @template B
 * @callback Task
 * @param {A} item
 * @returns {Promise.<B> | B}
 */
type Task<A, B> = (item: A) => Promise<B> | B;
type Input<A> = AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>;

export class Concurrency {
    /**
     * Same as Promise.all(items.map(item => task(item))), but it limits the concurrent execution to {maxConcurrency}
     *
     * @template A
     * @template B
     * @param {AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<B[]>}
     */
    static async map<A, B>(items: Input<A>, maxConcurrency: number, task: Task<A, B>): Promise<B[]> {
        return new Promise<B[]>(async (resolve, reject) => {
            const isAsync = isAsyncIterator(items);
            const isSync = isIterator(items);
            const results: B[] = new Array();

            if (!isAsync && !isSync)
                throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

            const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
            let idx = 0;

            const wait = new Array(maxConcurrency);
            for (let i = 0; i < maxConcurrency; i++)
                wait[i] = new Promise<void>(
                    async (resolve, reject) => {
                        try {
                            do {
                                const item = await iterator.next();
                                if (item.done) break;

                                const index = idx;
                                idx++;

                                results[index] = await task(await item.value);
                            } while (true);

                            resolve();
                        } catch (err) {
                            reject(err);
                            return;
                        }
                    }
                );

            await Promise
                .all(wait)
                .then(() => resolve(results))
                .catch(err => reject(err));
        });
    }

    /**
     * Same as Promise.allSettled(items.map(item => task(item))), but it limits the concurrent execution to {maxConcurrency}
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<PromiseSettledResult.<B>[]>}
     */
    static async mapSettled<A, B>(items: Input<A>, maxConcurrency: number, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        return new Promise<PromiseSettledResult<B>[]>(async (resolve, reject) => {
            const isAsync = isAsyncIterator(items);
            const isSync = isIterator(items);
            const results: PromiseSettledResult<B>[] = new Array();

            if (!isAsync && !isSync)
                throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

            const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
            let idx = 0;

            const wait = new Array(maxConcurrency);
            for (let i = 0; i < maxConcurrency; i++)
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
                                    value: await task(await item.value)
                                };
                            } catch (err) {
                                results[index] = {
                                    status: 'rejected',
                                    reason: err
                                };
                            }
                        } while (true);

                        resolve();
                    }
                );

            await Promise
                .all(wait)
                .then(() => resolve(results))
                .catch(err => reject(err));
        });
    }

    /**
     * Same as Promise.all(items.map(item => {task(item)})), but it limits the concurrent execution to {maxConcurrency}
     *
     * @template A
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, void>} task The task to run for each item.
     * @returns {Promise.<void>}
     */
    static async forEach<A>(items: Input<A>, maxConcurrency: number, task: Task<A, void>): Promise<void> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();

        const wait = new Array(maxConcurrency);
        for (let i = 0; i < maxConcurrency; i++)
            wait[i] = new Promise<void>(
                async (resolve, reject) => {
                    try {
                        do {
                            const item = await iterator.next();
                            if (item.done) break;

                            await task(await item.value);
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

    #maxConcurrency: number;
    #eventEmitter: EventEmitter = new EventEmitter();
    #running: number = 0;
    #queue: { taskId: symbol; task: Function; }[] = [];
    #isProcessing: boolean = false;

    /**
     * 
     * @param {number} maxConcurrency 
     */
    constructor(maxConcurrency: number) {
        if (typeof maxConcurrency !== 'number' || isNaN(maxConcurrency))
            throw new Error('Parameter maxConcurrency invalid!');

        this.#maxConcurrency = maxConcurrency;

        this.#eventEmitter
            .on('newTask', async (item: any) => {
                this.#queue.push(item);
                if (!this.#isProcessing) {
                    this.#isProcessing = true;
                    this.#run();
                }
            });
    }

    async #run() {
        const free = Symbol();

        while (this.#queue.length > 0) {
            const item = this.#queue.splice(0, 1)[0];
            this.#running++;

            item
                .task()
                .then((res: any) => {
                    this.#eventEmitter.emit(item.taskId, {
                        taskId: item.taskId,
                        result: res
                    });
                })
                .catch((err: any) => {
                    this.#eventEmitter.emit(item.taskId, {
                        taskId: item.taskId,
                        error: err
                    });
                })
                .finally(() => {
                    this.#running--;
                    this.#eventEmitter.emit(free);
                });

            while (this.#running >= this.#maxConcurrency)
                await this.#eventEmitter.once(free);
        }
        this.#isProcessing = false;
    }

    /**
     * TODO DESC
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<B[]>}
     */
    async map<A, B>(items: A[], task: Task<A, B>): Promise<B[]> {
        const results = [];
        let error: any;

        for (const item of items) {
            if (error)
                throw error;

            const taskId = Symbol();

            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.once(taskId, (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .catch(err => {
                            error = err;
                            return;
                        })
                );

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return Promise
            .all(results)
            .then(res => {
                if (error)
                    throw error;

                const result: any = res;
                return result;
            });
    }

    /**
     * TODO DESC
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<PromiseSettledResult.<B>[]>}
     */
    async mapSettled<A, B>(items: A[], task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const results = [];

        for (const item of items) {
            const taskId = Symbol();

            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.once(taskId, (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .then(result => ({ error: null, result }))
                        .catch(error => ({ error, result: null }))
                );

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return await Promise
            .all(results)
            .then(res => {
                const response: any[] = res
                    .map(x => {
                        if (x.error)
                            return /** @type * */{
                                status: "rejected",
                                reason: x.error
                            }

                        return {
                            status: "fulfilled",
                            value: x.result
                        }
                    });

                return response;
            });
    }

    /**
     * TODO DESC
     *
     * @template A
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, void>} task The task to run for each item.
     * @returns {Promise.<void>}
     */
    async forEach<A>(items: A[], task: Task<A, void>): Promise<void> {
        const results = [];
        let error: any;

        for (const item of items) {
            if (error)
                throw error;

            const taskId = Symbol();

            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.once(taskId, (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .catch(err => {
                            error = err;
                            return;
                        })
                )

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return Promise
            .all(results)
            .then(() => {
                if (error)
                    throw error;

                return;
            });
    }

    get currentRunning() {
        return this.#running;
    }
}

Object.freeze(Concurrency);
