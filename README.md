# @lzptec/concurrency
Lightweight concurrency manager

# Installation

npm
```sh
npm i @lzptec/concurrency
```

pnpm
```sh
pnpm i @lzptec/concurrency
```

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
const dataMultipliedBy2 = await Batch.map(data, 2, (value) => value * 2);
```

### Instance
```ts
import { Batch } from '@lzptec/concurrency';

const batch = new Batch(2);
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
const dataMultipliedBy2 = await Concurrency.map(data, 2, (value) => value * 2);
```

### Instance
```ts
import { Concurrency } from '@lzptec/concurrency';

const concurrency = new Concurrency(2);
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Execute multiplication concurrently(Maximum of 2 execution per time)
// EX: 1, 2 ... 3 ... 4,5 ... 6 ... 7 ... 8, 9
const dataMultipliedBy2 = await concurrency.map(data, 2, (value) => value * 2);
```

# API

## Task\<A, B\> = (item: A) => B
A: Task Input

B: Task Output

## Batch

### map\<A, B\>(input, batchSize*, task)
Returns: `Promise<B>`

Same as Promise.all(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### batchSize*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The batch size.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### mapSettled\<A, B\>(input, batchSize*, task)
Returns: `Promise<PromiseSettledResult<B>>`

Same as Promise.allSettled(input.map(item => task(item))), but it waits for the first `batchSize` promises to finish before starting the next batch.

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### batchSize*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The batch size.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### forEach\<A\>(input, batchSize*, task)

Returns: `Promise<void>`

Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
Same as Batch.map, But it doesn't store/return the results.

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### batchSize*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The batch size.

#### task
**Required**<br>
Type: `Task<A, void>`<br>

The task to run for each item.


## Concurrency

### map\<A, B\>(input, maxConcurrency*, task)
Returns: `Promise<B>`

Same as Promise.all(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### maxConcurrency*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The max concurrency.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### mapSettled\<A, B\>(input, maxConcurrency*, task)
Returns: `Promise<PromiseSettledResult<B>>`

Same as Promise.allSettled(input.map(item => task(item))), but it limits the concurrent execution to `maxConcurrency`.

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### maxConcurrency*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The max concurrency.

#### task
**Required**<br>
Type: `Task<A, B>`<br>

The task to run for each item.

### forEach\<A\>(input, maxConcurrency*, task)

Returns: `Promise<void>`

Same as Batch.map, But it doesn't return the results

\* Only required in Global

#### input
**Required**<br>
Type: `Input<A>`<br>

Arguments to pass to the task for each call.

#### maxConcurrency*
**Required**<br>
Type: `number`<br>
Scope: `Global`<br>

The max concurrency.

#### task
**Required**<br>
Type: `Task<A, void>`<br>

The task to run for each item.

# Notes

Documentation will be updated over time.