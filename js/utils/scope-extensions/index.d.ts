import { Wrapper } from './use';

export declare global {
	type NonUndefined<T> = T extends undefined ? never : T;
	type WrapperIfNonUndefined<R> = R extends undefined ? undefined : Wrapper<NonUndefined<R>>;
};
