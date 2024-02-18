/**
 * created by liushanbao
 * @description An easy-to-use React state manager
 * @author liushanbao
 * @date 2022-05-05
 * @name createStore
 */
import type {
  ExternalMapType, ExternalMapValue, StateFnType, StoreMap, StoreOptions,
  Store, StateCallback, StoreMapValueType, State,
  InitialState, StateRefCounterMapType, StateWithThisType, ClassThisPointerType,
} from "./types";
import type { StateRestoreAccomplishedMapType, InitialFnCanExecMapType } from "../reset/types";
import type { Unsubscribe, Listener } from "../subscribe/types";
import type { AnyFn, MapType, ValueOf, PrimitiveState } from "../types";
import { scheduler } from "../scheduler";
import {
  __CLASS_CONNECT_STORE_KEY__, __CLASS_UNMOUNT_HANDLE_KEY__, __CLASS_FN_INITIAL_HANDLE_KEY__,
} from "../classConnect/static";
import { batchUpdate, __REGENERATIVE_SYSTEM_KEY__, __USE_STORE_KEY__ } from "./static";
import { hasOwnProperty } from "../utils";
import {
  stateErrorHandle, optionsErrorHandle, protoPointStoreErrorHandle, subscribeErrorHandle,
} from "./errors";
import {
  pushTask, connectHookUse, finallyBatchHandle, connectStore,
  mapToObject, objectToMap, classUpdater, connectClassUse,
} from "./utils";
import { mergeStateKeys, handleReducerState, deferHandle, initialStateFnRestoreHandle } from "../reset";
import { willUpdatingHandle } from "../subscribe";
import { useEffect } from "react";
import { Scheduler } from "../scheduler/types";

/**
 * createStore
 * created by liushanbao
 * @description Create a state storage container that can be used globally
 * @author liushanbao
 * @date 2022-05-05
 * @param initialState
 * @param options
 * @return Store<S>
 */
export const createStore = <S extends PrimitiveState>(
  initialState?: InitialState<S>,
  options?: StoreOptions,
): Store<S> => {
  // Retrieve the reducerState
  const reducerState = initialState === undefined
    ? ({} as StateWithThisType<S>)
    : typeof initialState === "function"
      ? initialState()
      : initialState;

  stateErrorHandle(reducerState, "createStore");

  optionsErrorHandle("createStore", options);
  const optionsTemp = options
    ? {
      __useConciseStateMode__: options.__useConciseStateMode__ ?? undefined,
      unmountRestore: options.unmountRestore ?? true,
    }
    : { unmountRestore: true };

  const schedulerProcessor = scheduler<S>();

  // Tag counters for data references of store
  const storeStateRefCounterMap: StateRefCounterMapType = new Map().set("counter", 0);

  // Flag indicating that the initialStateFnRestoreHandle function is executable
  const initialFnCanExecMap: InitialFnCanExecMapType = new Map();

  // This is the identification of whether the logical execution of the reset recovery is complete (to prevent multiple resets)
  const stateRestoreAccomplishedMap: StateRestoreAccomplishedMapType = new Map();

  // Use Map and Set to improve performance without changing initialState, and Map and Set will be dominant in memory
  const stateMap: MapType<S> = objectToMap(reducerState);
  // Data status of the previous batch
  const prevBatchState: MapType<S> = objectToMap(reducerState);

  // Subscription listener stack
  const listenerSet = new Set<Listener<S>>();

  // The core map of store
  const storeMap: StoreMap<S> = new Map();

  // The storage stack of the this proxy object for the class component
  const classThisPointerSet = new Set<ClassThisPointerType<S>>();

  const setState = (state: State<S> | StateFnType<S>, callback?: StateCallback<S>) => {
    willUpdatingHandle(schedulerProcessor, prevBatchState, stateMap);

    let stateTemp = state;

    if (typeof state === "function") {
      // handle prevState
      stateTemp = (state as StateFnType<S>)(mapToObject(stateMap));
    }

    if (stateTemp !== null) {
      stateErrorHandle(stateTemp, "setState | syncUpdate");
      // The update of hook is an independent update dispatch action, and traversal processing is needed to unify the stack.
      Object.keys(stateTemp as NonNullable<State<S>>).forEach(key => {
        pushTask(
          key, (stateTemp as S)[key], stateMap, schedulerProcessor,
          optionsTemp, reducerState, storeStateRefCounterMap,
          storeMap, stateRestoreAccomplishedMap, initialFnCanExecMap,
          classThisPointerSet, initialState,
        );
      });
    }

    (schedulerProcessor.get("pushCallbackStack") as Scheduler<S>["pushCallbackStack"])(
      stateMap, stateTemp as State<S>, callback,
    );

    finallyBatchHandle(schedulerProcessor, prevBatchState, stateMap, listenerSet);
  };

  /**
   * @description syncUpdate primarily exists to address issues with normal text input.
   * to meet the needs of normal text input, it synchronizes React's update scheduling.
   */
  const syncUpdate = (state: State<S> | StateFnType<S>, callback?: StateCallback<S>) => {
    let stateTemp = state;

    if (typeof state === "function") {
      stateTemp = (state as StateFnType<S>)(mapToObject(stateMap));
    }
    // Borrowing setState to synchronize the update scheduling mechanism of Resy itself.
    setState(stateTemp, callback);

    if (stateTemp !== null) {
      batchUpdate(() => {
        Object.keys(stateTemp as NonNullable<State<S>>).forEach(key => {
          const value = (stateTemp as Partial<S> | S)[key];
          classUpdater(key, value, classThisPointerSet);
          (
            connectStore(
              key, optionsTemp, reducerState, stateMap, storeStateRefCounterMap, storeMap,
              stateRestoreAccomplishedMap, schedulerProcessor, initialFnCanExecMap, classThisPointerSet, initialState,
            ).get(key)!.get("updater") as StoreMapValueType<S>["updater"]
          )();
        });
      });
    }
  };

  // Reset recovery initialization state data
  const restore = (callback?: StateCallback<S>) => {
    willUpdatingHandle(schedulerProcessor, prevBatchState, stateMap);

    handleReducerState(reducerState, initialState);

    const state = {} as State<S>;
    mergeStateKeys(reducerState, prevBatchState).forEach(key => {
      const originValue = reducerState[key];
      if (!Object.is(originValue, stateMap.get(key))) {
        state![key] = originValue;
        pushTask(
          key, originValue, stateMap, schedulerProcessor, optionsTemp, reducerState,
          storeStateRefCounterMap, storeMap, stateRestoreAccomplishedMap, initialFnCanExecMap,
          classThisPointerSet, initialState, !hasOwnProperty.call(reducerState, key),
        );
      }
    });

    (schedulerProcessor.get("pushCallbackStack") as Scheduler<S>["pushCallbackStack"])(
      stateMap, state, callback,
    );

    finallyBatchHandle(schedulerProcessor, prevBatchState, stateMap, listenerSet);
  };

  // Subscription function
  const subscribe = (listener: Listener<S>, stateKeys?: (keyof S)[]): Unsubscribe => {
    subscribeErrorHandle(listener, stateKeys);
    const listenerWrap: Listener<S> = data => {
      const listenerKeysExist = stateKeys && stateKeys?.length > 0;
      /**
       * @description In fact, when the final subscription is triggered,
       * each of these outer layer listenerWraps subscribed is activated.
       * It's just that here, the execution of the inner listener is contingent upon a data change check,
       * which then determines whether the listener in subscribe should be executed.
       */
      if (
        (
          listenerKeysExist
          && Object.keys(data.effectState).some(key => stateKeys.includes(key))
        ) || !listenerKeysExist
      ) listener(data);
    };

    listenerSet.add(listenerWrap);

    // Returns the unsubscribing function, which allows the user to choose whether or not to unsubscribe,
    // because it is also possible that the user wants the subscription to remain in effect.
    return () => listenerSet.delete(listenerWrap as Listener<S>);
  };

  // Change options configuration
  const setOptions = (options: Pick<StoreOptions, "unmountRestore">) => {
    optionsErrorHandle("setOptions", options);
    optionsTemp.unmountRestore = options?.unmountRestore ?? optionsTemp.unmountRestore;
  };

  // Data updates for a single attribute
  const singlePropUpdate = (key: keyof S, value: ValueOf<S>, isDelete?: boolean) => {
    willUpdatingHandle(schedulerProcessor, prevBatchState, stateMap);
    pushTask(
      key, value, stateMap, schedulerProcessor, optionsTemp,
      reducerState, storeStateRefCounterMap, storeMap,
      stateRestoreAccomplishedMap, initialFnCanExecMap,
      classThisPointerSet, initialState, isDelete,
    );
    finallyBatchHandle(schedulerProcessor, prevBatchState, stateMap, listenerSet);
    return true;
  };

  /**
   * @description Map for additional related internal objects of store
   * For example, some related functions or identifiers,
   * such as setState, subscribe and internal identity __REGENERATIVE_SYSTEM_KEY__
   */
  const externalMap: ExternalMapType<S> = new Map();

  // A proxy object with the capabilities of updating and data tracking.
  const store = new Proxy(storeMap, {
    get: (_: StoreMap<S>, key: keyof S, receiver: any) => {
      protoPointStoreErrorHandle(receiver, store);

      const value = stateMap.get(key);
      if (typeof value === "function") {
        // Bind to the store for the convenience of using this as well as calling some related objects in externalMap.
        return (value as AnyFn).bind(store);
      }

      return externalMap.get(key as keyof ExternalMapValue<S>) || value;
    },
    set: (_: StoreMap<S>, key: keyof S, value: ValueOf<S>) => singlePropUpdate(key, value),
    // Delete will also play an updating role
    deleteProperty: (_: S, key: keyof S) => singlePropUpdate(key, undefined as ValueOf<S>, true),
  } as any as ProxyHandler<StoreMap<S>>) as any as Store<S>;

  // Driver update agent for useStore
  const storeProxy = new Proxy(storeMap, {
    get: (_, key: keyof S) => {
      const value = stateMap.get(key);
      if (typeof value === "function") {
        // Invoke a function data hook to grant the ability to update and render function data.
        connectHookUse(
          key, optionsTemp, reducerState, stateMap, storeStateRefCounterMap, storeMap,
          stateRestoreAccomplishedMap, schedulerProcessor, initialFnCanExecMap, classThisPointerSet, initialState,
        );
        return (value as AnyFn).bind(store);
      }
      return externalMap.get(key as keyof ExternalMapValue<S>) || connectHookUse(
        key, optionsTemp, reducerState, stateMap, storeStateRefCounterMap, storeMap,
        stateRestoreAccomplishedMap, schedulerProcessor, initialFnCanExecMap, classThisPointerSet, initialState,
      );
    },
  } as ProxyHandler<StoreMap<S>>);

  externalMap.set("setState", setState);
  externalMap.set("syncUpdate", syncUpdate);
  externalMap.set("restore", restore);
  externalMap.set("subscribe", subscribe);
  externalMap.set(__REGENERATIVE_SYSTEM_KEY__, __REGENERATIVE_SYSTEM_KEY__);

  if (optionsTemp.__useConciseStateMode__) {
    // Enable useConciseState to have data tracking capabilities through the store
    externalMap.set("store", store);
  } else {
    /**
     * @description useConciseState should not possess the capability
     * of the setOptions since local state control would become chaotic if there is local caching.
     * Caching is more meaningful in the context of the entire store.
     */
    externalMap.set("setOptions", setOptions);
  }

  /**
   * It is convenient for store.useStore() to call directly
   * 🌟 The reason why it is not changed to store.useStore
   * is due to the consideration of the rules for the use of the hook function.
   */
  const useStore = () => storeProxy;

  const useSubscribe = (listener: Listener<S>, stateKeys?: (keyof S)[]) => {
    useEffect(() => subscribe(listener, stateKeys), []);
  };

  // Connecting the this pointer of the class component (therefore, this cannot be an arrow function)
  function classConnectStore(this: ClassThisPointerType<S>) {
    classThisPointerSet.add(this);
    // Data agents for use by class
    return new Proxy(storeMap, {
      get: (_: StoreMap<S>, key: keyof S) => {
        if (typeof stateMap.get(key) === "function") {
          // A function is counted as a data variable if it has a reference
          connectClassUse.bind(this)(key, stateMap);
          return (stateMap.get(key) as AnyFn).bind(store);
        }
        return externalMap.get(key as keyof ExternalMapValue<S>)
          || connectClassUse.bind(this)(key, stateMap);
      },
      set: (_: StoreMap<S>, key: keyof S, value: ValueOf<S>) => singlePropUpdate(key, value),
      deleteProperty: (_: S, key: keyof S) => singlePropUpdate(key, undefined as ValueOf<S>, true),
    } as any as ProxyHandler<StoreMap<S>>);
  }

  // Unmount execution of class components
  function classUnmountHandle(this: ClassThisPointerType<S>) {
    classThisPointerSet.delete(this);
    deferHandle(
      optionsTemp, reducerState, stateMap, storeStateRefCounterMap,
      stateRestoreAccomplishedMap, schedulerProcessor, initialFnCanExecMap,
      classThisPointerSet, initialState,
    );
  }

  // The initialization function of createStore resets the recovery process for class component
  const classInitialFnHandle = () => {
    initialStateFnRestoreHandle(
      reducerState, stateMap, storeStateRefCounterMap, stateRestoreAccomplishedMap,
      initialFnCanExecMap, classThisPointerSet, initialState,
    );
  };

  externalMap.set("useStore", useStore);
  externalMap.set("useSubscribe", useSubscribe);
  externalMap.set(__USE_STORE_KEY__, storeProxy);
  /**
   * @description The reason why the three operation functions for class components
   * — connect, classUnmountHandle, and classInitialFnHandle
   * cannot be extracted for external operations
   * is that a simple external call cannot access these internal related data,
   * so they have to be written inside createStore.
   */
  externalMap.set(__CLASS_CONNECT_STORE_KEY__, classConnectStore);
  externalMap.set(__CLASS_UNMOUNT_HANDLE_KEY__, classUnmountHandle);
  externalMap.set(__CLASS_FN_INITIAL_HANDLE_KEY__, classInitialFnHandle);

  return store;
};
