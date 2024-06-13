export type RunnableTask<A, B> = (...args: A[]) => Promise<B> | B;

export type Task<A, B> = (item: A) => Promise<B> | B;

export type Input<A> = AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>;
