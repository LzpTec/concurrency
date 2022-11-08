export const isAsyncIterator = <A>(input: AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>): input is AsyncIterable<A | Promise<A>> => Symbol.asyncIterator in input;
export const isIterator = <A>(input: AsyncIterable<A | Promise<A>> | Iterable<A | Promise<A>>): input is Iterable<A | Promise<A>> => Symbol.iterator in input;