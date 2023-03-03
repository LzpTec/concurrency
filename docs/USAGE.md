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

Same as Promise.all(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

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

The task to run for each item.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### mapSettled\<A, B\>(taskOptions)
Returns: `Promise<PromiseSettledResult<B>>`

Same as Promise.allSettled(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

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

The task to run for each item.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

### forEach\<A\>(taskOptions)

Returns: `Promise<void>`

Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
Same as Batch.map, But it doesn't store/return the results.

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

The task to run for each item.

#### taskOptions.task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

#### taskOptions.batchInterval
Type: `number`<br>

Interval between batches(in MS).

## Batch(Instance)

### map\<A, B\>(input, task)
Returns: `Promise<B>`

Same as Promise.all(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

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

Same as Promise.allSettled(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

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

Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
Same as Batch.map, But it doesn't store/return the results.

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

Same as Promise.all(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

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

Same as Promise.allSettled(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

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

Same as Batch.map, But it doesn't return the results

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

## Concurrency(Instance)

### map\<A, B\>(input, task)
Returns: `Promise<B>`

Same as Promise.all(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

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

Same as Promise.allSettled(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

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

Same as Batch.map, But it doesn't return the results

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### task
**Required**<br>
Type: `Task<A, any>`<br>

The task to run for each item.
