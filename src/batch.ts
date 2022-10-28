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

const MAX_TASK_ID = Number.MAX_SAFE_INTEGER - 1;

export class Batch {
    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<B[]>}
     */
    static async map<A, B>(items: AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>, batchSize: number, task: Task<A, B>): Promise<B[]> {
        const isAsync = isAsyncIterator(items);
        const isSync = isIterator(items);
        const results: B[] = new Array();

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof items + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        let iterator = isAsync ? items[Symbol.asyncIterator]() : items[Symbol.iterator]();
        let idx = 0;


        let p = [];
        let done = false;

        do {
            if (done) break;

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
                                resolve();
                                throw 'done';
                            })
                            .then(res => task(res!))
                            .then(res => { results[index] = res!; resolve(); })
                            .catch(err => err !== 'done' ? reject(err) : {})
                    )
                );

            if (p.length >= batchSize) {
                await Promise.all(p);
                p = [];
            }

        } while (true);

        if (p.length > 0) {
            await Promise.all(p);
            p = [];
        }

        return results;
    }

    /**
     * Same as Promise.allSettled(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<PromiseSettledResult.<B>[]>}
     */
    static async mapSettled<A, B>(items: A[], batchSize: number, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        let position = 0;
        const results = new Array();
        while (position < items.length) {
            const itemsForBatch = items.slice(position, position + batchSize);
            results.push(...await Promise.allSettled(itemsForBatch.map(item => task(item))));
            position += batchSize;
        }
        return results;
    }

    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
     *
     * @template A
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} batchSize
     * @param {Task.<A, void>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    static async forEach<A>(items: A[], batchSize: number, task: Task<A, void>): Promise<void> {
        let position = 0;
        while (position < items.length) {
            const itemsForBatch = items.slice(position, position + batchSize);
            await Promise.all(itemsForBatch.map(item => task(item)));
            position += batchSize;
        }
    }

    #batchSize: number;
    #eventEmitter: EventEmitter = new EventEmitter();
    #currentTaskId: number = 0;
    #queue: { taskId: number; task: Function; }[] = [];
    #isProcessing: boolean = false;

    /**
     * 
     * @param {number} batchSize 
     */
    constructor(batchSize: number) {
        if (typeof batchSize !== 'number' || isNaN(batchSize))
            throw new Error('Parameter maxConcurrency invalid!');

        this.#batchSize = batchSize;

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
        while (this.#queue.length > 0) {
            const items = this.#queue.splice(0, this.#batchSize);

            await Promise.all(items.map(async item => {
                await item
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
                    });
            }));
        }
        this.#isProcessing = false;
    }

    /**
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
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

            const taskId = this.#currentTaskId >= (MAX_TASK_ID) ? (this.#currentTaskId = 0) : this.#currentTaskId++;

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
     * Same as Promise.allSettled(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
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
            const taskId = this.#currentTaskId >= (MAX_TASK_ID) ? (this.#currentTaskId = 0) : this.#currentTaskId++;

            results
                .push(
                    this.#eventEmitter
                        .once(taskId)
                        .then((task: any) => {
                            if (task.error) return { error: task.error, result: null };
                            return { error: null, result: task.result };
                        })
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
     * Same as Promise.all(items.map(item => task(item))), but it waits for
     * the first {batchSize} promises to finish before starting the next batch.
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

            const taskId = this.#currentTaskId >= (MAX_TASK_ID) ? (this.#currentTaskId = 0) : this.#currentTaskId++;

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
}

Object.freeze(Batch);
