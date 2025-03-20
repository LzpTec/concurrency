import { Batch } from "./batch";
import { every, filter, find, group, loop, map, mapSettled, some, validatePredicate, validateTask } from "./base/shared";
import { SharedBase } from "./base/shared-base";
import { Group, Input, Task } from "./base/types";

type Operation<A, B extends Input<A>, C> = (input: B, executor: SharedBase<any>) => Promise<Input<C>>;
export type InputType<TValue> = TValue extends Input<infer TResult> ? TResult : never;

type Overwrite<T, U> = Omit<T, keyof U> & U;

export type SingleValueChain<TInput extends Input<any>, TValue = InputType<TInput>> = Overwrite<
    Chain<TInput, TValue>,
    { get(): Promise<TValue> }
>

export class Chain<TInput extends Input<any>, TValue = InputType<TInput>> {
    #input: TInput;
    #operations: Operation<any, any, unknown>[] = [];
    #single = false;
    #runner: SharedBase<any>;

    constructor(input: TInput, runner: SharedBase<any>) {
        // @ts-ignore
        this.#input = input;
        this.#runner = runner;
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
        const newChain = new Chain<TValue[], TValue>(chain.#input as any, chain.#runner);
        newChain.#operations = [...chain.#operations, newOperation];
        newChain.#single = single;

        return newChain;
    };

    map<TNew>(task: Task<TValue, TNew>): Chain<TNew[], TNew> {
        validateTask(task);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = map(task);

            await executor[loop](input, fn);
            return results;
        });
    }

    mapSettled<TNew>(task: Task<TValue, TNew>): Chain<PromiseSettledResult<TNew>[], PromiseSettledResult<TNew>> {
        validateTask(task);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = mapSettled(task);

            await executor[loop](input, fn);
            return results;
        });
    }

    filter(predicate: Task<TValue, boolean>): Chain<TValue[], TValue> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = filter(predicate);

            await executor[loop](input, fn);
            return results;
        });
    }

    some(predicate: Task<TValue, boolean>): SingleValueChain<boolean[], boolean> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = some(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    find(predicate: Task<TValue, boolean>): SingleValueChain<TValue[], TValue | undefined> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = find(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    every(predicate: Task<TValue, boolean>): SingleValueChain<boolean[], boolean> {
        validatePredicate(predicate);

        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = every(predicate);

            await executor[loop](input, fn);
            return results;
        }, true);
    }

    group(task: Task<TValue, string | symbol>): Chain<Group<TValue>[], Group<TValue>> {
        validateTask(task);
        return Chain.#build(this, async (input: Input<TValue>, executor: SharedBase<any>) => {
            const { task: fn, results } = group(task);

            await executor[loop](input, fn);
            return [Object.fromEntries(results[0])];
        });
    }

    async get<TResult = TValue[]>(): Promise<TResult> {
        const res = await (async () => {
            let input: any = this.#input;
            for (const operation of this.#operations) {
                input = await operation(input, this.#runner);
            }

            return this.#single ? input[0] : input;
        })();

        return Promise.resolve(res);
    }

}

(async () => {
    const data = [1, 2, 3, 40, 50];

    const result = await new Chain(data, new Batch({ batchSize: 2 }))
        .filter(x => x < 10)
        .map(x => x.toString())
        .find(x => x === '3');

    console.log(result);
});

Object.freeze(Chain);
