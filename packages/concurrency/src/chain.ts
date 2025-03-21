import { Batch } from "./batch.js";
import { every, filter, find, group, loop, map, mapSettled, some, validatePredicate, validateTask } from "./base/shared.js";
import { SharedBase } from "./base/shared-base.js";
import { Group, Input, Task } from "./base/types.js";

type Operation<A, B extends Input<A>, C> = (input: B, executor: SharedBase<any>) => Promise<Input<C>>;
export type InputType<TValue> = TValue extends Input<infer TResult> ? TResult : never;

type Overwrite<T, U> = Omit<T, keyof U> & U;

export type SingleValueChain<TInput extends Input<any>, TValue = InputType<TInput>> = Overwrite<
    Chain<TInput, TValue>,
    { runWith(runner: SharedBase<any>): Promise<TValue> }
>

export class Chain<TInput extends Input<any>, TValue = InputType<TInput>> {
    #input: TInput;
    #operations: Operation<any, any, unknown>[] = [];
    #single = false;

    constructor(input: TInput) {
        // @ts-ignore
        this.#input = input;
    }

    static #build<TData, TInput extends Input<TData>, TValue = InputType<TInput>>(
        chain: Chain<any, any>,
        newOperation: Operation<TData, TInput, TValue>
    ): Chain<TValue[], TValue>;

    static #build<TData, TInput extends Input<TData>, TValue = InputType<TInput>>(
        chain: Chain<any, any>,
        newOperation: Operation<TData, TInput, TValue>,
        single: true
    ): SingleValueChain<TValue[], TValue>;

    static #build<TData, TInput extends Input<TData>, TValue = InputType<TInput>>(
        chain: Chain<any, any>,
        newOperation: Operation<TData, TInput, TValue>,
        single: boolean = false
    ): Chain<TValue[], TValue> | SingleValueChain<TValue[], TValue> {
        const newChain = new Chain<TValue[], TValue>(chain.#input as any);
        newChain.#operations = [...chain.#operations, newOperation];
        newChain.#single = single;

        return newChain;
    };

    /**
     * Performs the specified `task` function on each element in the `input`, and returns an `Chain` that contains the results.
     * 
     * @template TValue Input Type.
     * @template TNew Output Type.
     * @param {Task<TValue, TNew>} task task to run.
     * @returns {Chain<TNew[], TNew>}
     */
    map<TNew>(task: Task<TValue, TNew>): Chain<TNew[], TNew> {
        validateTask(task);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = map(task);

            await executor[loop](input, fn);
            return results;
        });
    }

    /**
     * Performs the specified `task` function on each element in the `input`, 
     * and returns an `Chain` that contains all of the tasks results as resolve or reject.
     * 
     * @template TValue Input Type.
     * @template TNew Output Type.
     * @param {Task<TValue, TNew>} task task to run.
     * @returns {Chain<PromiseSettledResult<TNew>[], PromiseSettledResult<TNew>>}
     */
    mapSettled<TNew>(task: Task<TValue, TNew>): Chain<PromiseSettledResult<TNew>[], PromiseSettledResult<TNew>> {
        validateTask(task);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = mapSettled(task);

            await executor[loop](input, fn);
            return results;
        });
    }

    /**
     * Returns an `Chain` that contains the elements that meet the condition specified in the `predicate` function.
     *
     * @template TValue Input Type.
     * @param {Task<TValue, boolean>} predicate predicate to run.
     * @returns {Chain<TValue[], TValue>}
     */
    filter(predicate: Task<TValue, boolean>): Chain<TValue[], TValue> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = filter(predicate);

            await executor[loop](input, fn);
            return results;
        });
    }

    /**
     * Returns an `Chain` that contains whether the specified `predicate` function returns true for any element of `input`.
     *
     * @template TValue Input Type.
     * @param {Task<TValue, boolean>} predicate predicate to run.
     * @returns {SingleValueChain<boolean[], boolean>}
     */
    some(predicate: Task<TValue, boolean>): SingleValueChain<boolean[], boolean> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = some(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    /**
     * Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.
     *
     * @template TValue Input Type.
     * @param {Task<TValue, boolean>} predicate predicate to run.
     * @returns {SingleValueChain<boolean[], TValue | undefined>}
     */
    find(predicate: Task<TValue, boolean>): SingleValueChain<TValue[], TValue | undefined> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = find(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     *
     * @template TValue Input Type.
     * @param {Task<TValue, boolean>} predicate predicate to run.
     * @returns {SingleValueChain<boolean[], TValue | undefined>}
     */
    every(predicate: Task<TValue, boolean>): SingleValueChain<boolean[], boolean> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = every(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    /**
     * This method groups the elements of the `input` according to the string or symbol values returned by a provided `task`.
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group.
     * 
     * @template TValue Input Type.
     * @template TNew Output Type.
     * @param {Task<TValue, string | symbol>} task task to run.
     * @returns {Chain<Group<TValue>[], Group<TValue>>}
     */
    group(task: Task<TValue, string | symbol>): Chain<Group<TValue>[], Group<TValue>> {
        validateTask(task);
        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = group(task);

            await executor[loop](input, fn);
            return [Object.fromEntries(results[0])];
        });
    }

    async runWith<TResult = TValue[]>(runner: SharedBase<any>): Promise<TResult> {
        const res = await (async () => {
            let input: any = this.#input;
            for (const operation of this.#operations) {
                input = await operation(input, runner);
            }

            return this.#single ? input[0] : input;
        })();

        return Promise.resolve(res);
    }

}

(async () => {
    const data = [1, 2, 3, 40, 50];

    const result = await new Chain(data)
        .filter(x => x < 10)
        .map(x => x.toString())
        .find(x => x === '3')
        .runWith(new Batch({ batchSize: 2 }));

    console.log(result);
});

Object.freeze(Chain);
