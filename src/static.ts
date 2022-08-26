// @ts-ignore
// import { unstable_batchedUpdates } from "react-platform";
// todo test
import { unstable_batchedUpdates } from "react-dom";
import { Callback } from "./model";

/**
 * batchUpdateShimRun
 * @description 一个unstable_batchedUpdates的shim垫片
 */
export function batchUpdateShimRun(fn: Callback) { fn() }

/**
 * React-v18中所有的更新以及是自动化批处理的了，但是unstable_batchedUpdates这个API它目前还仍然在18的版本中可以使用，
 * 但不保证未来会有去除这个非正式API的可能性，所以做一个垫片保证代码的安全稳健性
 */
export const batchUpdate = unstable_batchedUpdates || batchUpdateShimRun;

// 每一个resy生成store的监听订阅对象、内部state数据的唯一标识key值
export const storeHeartMapKey = Symbol("resyStoreListenerSymbolKey");

// useState驱动更新的key
export const useStateKey = Symbol("useStateKey");

/**
 * setState的更新函数key
 * 不能是symbol类型，因为这个key访问的时候是外部使用访问，就是这个固定的key->setState
 * 不像storeHeartMapKey或者useStateKey这样是内部使用的key
 */
export const setStateKey = "setState";

// 订阅函数的key，与setState更新函数的key同理
export const subscribeKey = "subscribe";

// pureView中获取nextState的整个Map数据的key
export const pureViewNextStateMapKey = Symbol("pureViewNextStateMapKey");
