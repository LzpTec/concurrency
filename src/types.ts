export type RunnableTask<A, B> = (...args: A[]) => Promise<B> | B;

export type Task<A, B> = (item: A) => Promise<B> | B;

export type Input<A> = AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>;

export type Job<T> = { 
    task: Function; 
    resolve: (data: T) => void; 
    reject: (err: unknown) => void; 
    args: any[];
};
