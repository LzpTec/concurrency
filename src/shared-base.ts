import { isAsyncIterator, isIterator } from './guards';
import { every, filter, find, group, loop, map, mapSettled, some } from './shared';
import type { Input, RunnableTask, Task } from './types';

export function validateAndProcessInput<A>(input: Input<A>) {
    const isAsync = isAsyncIterator<A>(input);
    const isSync = isIterator<A>(input);

    if (!isAsync && !isSync)
        throw new TypeError("Expected `input(" + typeof input + ")` to be an `Iterable` or `AsyncIterable`");

    if (isAsync) {
        return input[Symbol.asyncIterator]();
    }

    return input[Symbol.iterator]();
}

export function validateTask<A, B>(task: Task<A, B>) {
    const fieldType = typeof task;
    if (fieldType !== 'function')
        throw new TypeError("Expected `task(" + fieldType + ")` to be a `function`");
}

export function validatePredicate<A>(predicate: Task<A, boolean>) {
    const fieldType = typeof predicate;
    if (fieldType !== 'function')
        throw new TypeError("Expected `predicate(" + fieldType + ")` to be a `function`");
}

export abstract class SharedBase<Options> {

    abstract [loop] <A>(input: Input<A>, task: Task<A, any>): Promise<void>;

    /**
     * Performs a specified task.
     *
     * @template A
     * @template B
     * @param {RunnableTask<A, B>} task Arguments to pass to the task for each call.
     * @param {A[]} [args] The task to run for each item.
     * @returns {Promise<B>}
     */
    abstract run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B>;

    /**
     * Instance Options.
     */
    abstract set options(options: Options);

    /**
     * Instance Options.
     */
    abstract get options(): Options;

    /**
     * Performs the specified `task` for each element in the input.
     * 
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, any>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    async forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
        validateTask(task);
        return this[loop](input, task);
    }

    /**
     * Performs the specified `task` function on each element in the `input`, and returns an array that contains the results.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    async map<A, B>(input: Input<A>, task: Task<A, B>): Promise<B[]> {
        validateTask(task);

        const results: B[] = new Array();
        await this[loop](input, (item) => map(results, item, task));
        return results;
    }

    /**
     * Performs the specified `task` function on each element in the `input`, 
     * and creates a Promise that is resolved with an array of results when all of the tasks are resolve or reject.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    async mapSettled<A, B>(input: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        validateTask(task);

        const results: PromiseSettledResult<B>[] = new Array();
        await this[loop](input, (item) => mapSettled(results, item, task));
        return results;
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function.
     *
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<void>}
     */
    async filter<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<A[]> {
        validatePredicate(predicate);

        const results: A[] = new Array();
        await this[loop](input, (item) => filter(results, item, predicate));
        return results;
    }

    /**
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<boolean>}
     */
    async some<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<boolean> {
        validatePredicate(predicate);

        const result = { value: false };

        await this[loop](input, (item) => some(result, item, predicate));

        return result.value;
    }

    /**
     * Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<A | undefined>}
     */
    async find<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<A | undefined> {
        validatePredicate(predicate);

        const result = { value: undefined };

        await this[loop](input, (item) => find(result, item, predicate));

        return result.value;
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<boolean>}
     */
    async every<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<boolean> {
        validatePredicate(predicate);

        const result = { value: true };

        await this[loop](input, async (item) => every(result, item, predicate));

        return result.value;
    }

    /**
     * This method groups the elements of the `input` according to the string values returned by a provided `task`. 
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group. 
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, string | symbol>} task A function to execute for each element in the `input`. It should return a value that can get coerced into a property key (string or symbol) indicating the group of the current element.
     * @returns {Promise<{string | symbol}>}
     */
    async group<A>(input: Input<A>, task: Task<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
        validateTask(task);

        const result = new Map<string | symbol, A[]>();

        await this[loop](input, (item) => group(result, item, task));

        return Object.fromEntries(result);
    }

}
