# Usage

The following examples uses Typescript

## Batch

Batch has two modes: Global and Instance

### Global
```ts
import { Batch } from '@lzptec/concurrency';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Execute multiplication in batchs of 2
// EX: 1,2 ... 3,4 ... 5,6 ... 7,8 ... 9
const dataMultipliedBy2 = await Batch.map({
    input: data,
    batchSize: 2,
    task: (value) => value * 2
});
```

### Instance
```ts
import { Batch } from '@lzptec/concurrency';

const batch = new Batch({
    batchSize: 2
});
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Execute multiplication in batchs of 2
// EX: 1,2 ... 3,4 ... 5,6 ... 7,8 ... 9
const dataMultipliedBy2 = await batch.map(data, (value) => value * 2);
```

## Concurrency

### Global
```ts
import { Concurrency } from '@lzptec/concurrency';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Execute multiplication concurrently(Maximum of 2 execution per time)
// EX: 1, 2 ... 3 ... 4,5 ... 6 ... 7 ... 8, 9
const dataMultipliedBy2 = await Concurrency.map({
    input: data,
    maxConcurrency: 2,
    task: (value) => value * 2
});
```

### Instance
```ts
import { Concurrency } from '@lzptec/concurrency';

const concurrency = new Concurrency({
    maxConcurrency: 2
});
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Execute multiplication concurrently(Maximum of 2 execution per time)
// EX: 1, 2 ... 3 ... 4,5 ... 6 ... 7 ... 8, 9
const dataMultipliedBy2 = await concurrency.map(data, (value) => value * 2);
```

# API

## Task\<A, B\> = (item: A) => B
A: Task Input

B: Task Output

## Batch(Static)

### map\<A, B\>(taskOptions)
Returns: `Promise<B>`

Performs the specified `task` function on each element in the `input`, and returns an array that contains the results.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### mapSettled\<A, B\>(taskOptions)
Returns: `Promise<PromiseSettledResult<B>>`

Performs the specified `task` function on each element in the `input`, 
and creates a Promise that is resolved with an array of results when all of the tasks are resolve or reject.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### forEach\<A\>(taskOptions)
Returns: `Promise<void>`

Performs the specified `task` for each element in the `input`.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### filter\<A\>(taskOptions)
Returns: `Promise<A>`

Returns the elements that meet the condition specified in the `predicate` function.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### some\<A\>(taskOptions)
Returns: `Promise<boolean>`

Determines whether the specified `predicate` function returns true for any element of `input`.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### find\<A\>(taskOptions)
Returns: `Promise<A | undefined>`

Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### every\<A\>(taskOptions)
Returns: `Promise<boolean>`

Determines whether all the elements of `input` satisfy the specified `predicate`.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### group\<A\>(taskOptions)
Returns: `{ [key: string | symbol]: A[] }`

This method groups the elements of the `input` according to the string values returned by a provided `task`.

The returned object has separate properties for each group, containing arrays with the elements in the group.

It runs in batches with size defined by `batchSize`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.batchSize
**Required**<br>
Type: `number`<br>

The batch size.

#### taskOptions.task
**Required**<br>
Type: `Task<A, string | symbol>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

## Batch(Instance)

### map\<A, B\>(input, task)
Returns: `Promise<B>`

Calls a defined `task` function on each element of the `input`, and returns an array that contains the results.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### mapSettled\<A, B\>(input, task)
Returns: `Promise<PromiseSettledResult<B>>`

Same as `Promise.allSettled` with a map.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### forEach\<A\>(input, task)
Returns: `Promise<void>`

Performs the specified `task` for each element in the input.
Same as map, But it doesn't store/return the results.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, any>`<br>

The task to run for each item.

## Concurrency(Static)

### map\<A, B\>(taskOptions)
Returns: `Promise<B>`

Performs the specified `task` function on each element in the `input`, and returns an array that contains the results.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### mapSettled\<A, B\>(taskOptions)
Returns: `Promise<PromiseSettledResult<B>>`

Performs the specified `task` function on each element in the `input`, 
and creates a Promise that is resolved with an array of results when all of the tasks are resolve or reject.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### forEach\<A\>(taskOptions)
Returns: `Promise<void>`

Performs the specified `task` for each element in the `input`.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.task
**Required**<br>
Type: `Task<A, any>`<br>

The task to run for each item.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### filter\<A\>(taskOptions)
Returns: `Promise<A>`

Returns the elements that meet the condition specified in the `predicate` function.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### some\<A\>(taskOptions)
Returns: `Promise<boolean>`

Determines whether the specified `predicate` function returns true for any element of `input`.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### find\<A\>(taskOptions)
Returns: `Promise<A | undefined>`

Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### every\<A\>(taskOptions)
Returns: `Promise<boolean>`

Determines whether all the elements of `input` satisfy the specified `predicate`.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.predicate
**Required**<br>
Type: `Task<A, boolean>`<br>

The predicate function is called one time for each element in the `input`.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

### group\<A\>(taskOptions)
Returns: `{ [key: string | symbol]: A[] }`

This method groups the elements of the `input` according to the string values returned by a provided `task`.

The returned object has separate properties for each group, containing arrays with the elements in the group.

It limits the concurrent execution to `maxConcurrency`.

#### taskOptions
**Required**<br>
Type: `Object`<br>

#### taskOptions.input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### taskOptions.maxConcurrency
**Required**<br>
Type: `number`<br>

The max concurrency.

#### taskOptions.task
**Required**<br>
Type: `Task<A, string | symbol>`<br>

The task to run for each item.

#### taskOptions.concurrencyInterval
Type: `number`<br>

Interval between jobs(in MS).

## Concurrency(Instance)

### map\<A, B\>(input, task)
Returns: `Promise<B>`

Calls a defined `task` function on each element of the `input`, and returns an array that contains the results.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### mapSettled\<A, B\>(input, task)
Returns: `Promise<PromiseSettledResult<B>>`

Same as `Promise.allSettled` with a map.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### forEach\<A\>(input, task)
Returns: `Promise<void>`

Performs the specified `task` for each element in the input.
Same as map, But it doesn't store/return the results.

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, any>`<br>

The task to run for each item.
