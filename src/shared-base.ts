import { isAsyncIterator, isIterator } from './guards';
import { Input, RunnableTask, Task } from './types';

export const interrupt = {};

export abstract class SharedBase<Options> {

    /**
     * Performs the specified `task` for each element in the input.
     * 
     * Same as map, But it doesn't store/return the results.
     * 
     * @template A
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, any>} task The task to run for each item.
     * @returns {Promise<void>}
     */
    abstract forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void>;

    /**
     * Same as `Promise.allSettled` with a map.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    abstract mapSettled<A, B>(input: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]>;

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
     * Calls a defined `task` function on each element of the `input`, and returns an array that contains the results.
     *
     * @template A
     * @template B
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, B>} task The task to run for each item.
     * @returns {Promise<B[]>}
     */
    async map<A, B>(input: Input<A>, task: Task<A, B>): Promise<B[]> {
        const results: B[] = new Array();

        await this.forEach(input, async (item) => results.push(await task(item)));

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
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
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
     * Returns the value of the first element of `input` where `predicate` is true, and undefined otherwise.
     * 
     * @template A Input Type.
     * @param {Input<A>} input Arguments to pass to the task for each call.
     * @param {Task<A, boolean>} predicate The task to run for each item.
     * @returns {Promise<A | undefined>}
     */
    async find<A>(input: Input<A>, predicate: Task<A, boolean>): Promise<A | undefined> {
        let result;

        await this
            .forEach(input, async (item) => {
                if (await predicate(item)) {
                    result = item;
                    return interrupt;
                }
            });

        return result;
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
        let result = true;

        await this
            .forEach(input, async (item) => {
                if (!(await predicate(item))) {
                    result = false;
                    return interrupt;
                }
            });

        return result;
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
        const groups = new Map<string | symbol, A[]>();

        await this
            .forEach(input, async (item) => {
                const group = await task(item);

                if (groups.has(group))
                    groups.get(group)!.push(item);
                else
                    groups.set(group, [item]);
            });

        return Object.fromEntries(groups);
    }

    protected processTaskInput<A, B>(input: Input<A>, task: Task<A, B>) {
        const isAsync = isAsyncIterator(input);
        const isSync = isIterator(input);

        if (!isAsync && !isSync)
            throw new TypeError("Expected \`input(" + typeof input + ")\` to be an \`Iterable\` or \`AsyncIterable\`");

        const fieldType = typeof task;
        if (fieldType !== 'function')
            throw new TypeError("Expected \`task(" + fieldType + ")\` to be a \`function\`");

        return isAsync ? input[Symbol.asyncIterator]() : input[Symbol.iterator]();
    }

}
