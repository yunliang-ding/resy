// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import { unstable_batchedUpdates } from "react-platform";
import type { Callback } from "../types";

/** Batch processing safety shim */
export const batchUpdateShimRun = (fn: Callback) => fn();

export const batchUpdate = unstable_batchedUpdates || batchUpdateShimRun;

// A special identifier within the store generated by createStore
export const __REGENERATIVE_SYSTEM_KEY__ = Symbol("regenerativeSystemKey");

// The key of useStore
export const __USE_STORE_KEY__ = Symbol("useStoreKey");