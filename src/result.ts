export type Ok<T> = { readonly _tag: 'Ok'; readonly value: T }
export type Err<E> = { readonly _tag: 'Err'; readonly error: E }
export type Result<T, E> = Ok<T> | Err<E>

export type AsyncResult<T, E> = Promise<Result<T, E>>

export const ok = <T>(value: T): Ok<T> => ({ _tag: 'Ok', value })
export const err = <E>(error: E): Err<E> => ({ _tag: 'Err', error })
export const okAsync = <T, E = never>(value: T): AsyncResult<T, E> => Promise.resolve(ok(value))
export const errAsync = <T = never, E = unknown>(error: E): AsyncResult<T, E> => Promise.resolve(err(error))

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r._tag === 'Ok'

export const flatMapAsync = <T, U, E, E2>(ar: AsyncResult<T, E>, fn: (v: T) => AsyncResult<U, E2>) =>
  ar.then<Result<U, E | E2>>(r => (isOk(r) ? fn(r.value) : r))

export const fromPromise = <T, E>(promise: Promise<T>, onReject: (e: unknown) => E) =>
  promise.then(
    value => ok(value),
    cause => err(onReject(cause))
  )
