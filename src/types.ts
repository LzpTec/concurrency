/**
 * @template A
 * @template B
 * @callback RunnableTask
 * @param {A[]} args
 * @returns {Promise<B> | B}
 */
export type RunnableTask<A, B> = (...args: A[]) => Promise<B> | B;

/**
 * @template A
 * @template B
 * @callback Task
 * @param {A} item
 * @returns {Promise<B> | B}
 */
export type Task<A, B> = (item: A) => Promise<B> | B;

/**
 * @template A
 * @typedef {AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>} Input
 */
export type Input<A> = AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>;

/**
 * @typedef Job
 * @property {Function} task
 * @property {Function} resolve
 * @property {Function} reject
 */
export type Job = { task: Function; resolve: Function; reject: Function; };
