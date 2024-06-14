import { every, filter, find, group, loop, map, mapSettled, some, validatePredicate, validateTask } from './shared';
import type { Group, Input, RunnableTask, Task } from './types';

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

        const { task: fn, results } = map(task);
        await this[loop](input, fn);
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

        const { task: fn, results } = mapSettled(task);
        await this[loop](input, fn);
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

        const { task: fn, results } = filter(predicate);
        await this[loop](input, fn);
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

        const { task: fn, results } = some(predicate);
        await this[loop](input, fn);
        return results[0];
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

        const { task: fn, results } = find(predicate);
        await this[loop](input, fn);
        return results[0];
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

        const { task: fn, results } = every(predicate);
        await this[loop](input, fn);
        return results[0];
    }

    /**
     * This method groups the elements of the `input` according to the string values returned by a provided `task`. 
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group. 
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, string | symbol>} task A function to execute for each element in the `input`. It should return a value that can get coerced into a property key (string or symbol) indicating the group of the current element.
     * @returns {Promise<Group<A>>}
     */
    async group<A>(input: Input<A>, task: Task<A, string | symbol>): Promise<Group<A>> {
        validateTask(task);

        const { task: fn, results } = group(task);
        await this[loop](input, fn);
        return Object.fromEntries(results[0]);
    }

}
