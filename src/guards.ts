export function isAsyncIterator<A>(input: any): input is AsyncIterable<A | Promise<A>>{
    return typeof input[Symbol.asyncIterator] === 'function';
}

export function isIterator<A>(input: any): input is Iterable<A | Promise<A>> {
    return typeof input[Symbol.iterator] === 'function';
}
