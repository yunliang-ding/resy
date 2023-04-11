/**
 * created by liushanbao
 * @description 一款简单易用的React数据状态管理器
 * @author liushanbao
 * @date 2022-05-05
 * @name createStore
 */
import useSyncExternalStoreExports from "use-sync-external-store/shim";
import schedulerProcessor from "./scheduler";
import EventDispatcher from "./listener";
import {
  batchUpdate, STORE_CORE_MAP_KEY, USE_STORE_KEY, USE_CONCISE_STORE_KEY, _DEV_, EVENT_TYPE,
} from "./static";
import { updateDataErrorHandle, mapToObject } from "./utils";
import type {
  Callback, ExternalMapType, ExternalMapValue, State, StateFunc, StoreCoreMapType, StoreCoreMapValue,
  StoreMap, StoreMapValue, StoreMapValueType, Unsubscribe, Scheduler, CustomEventListener, Listener,
  CreateStoreOptions, Store, AnyFn, ConciseExternalMapType, ConciseExternalMapValue,
  SetStateCallback, SetStateCallbackItem, MapPartial,
} from "./model";

/**
 * 从use-sync-external-store包的导入方式到下面的引用方式
 * 是为了解决该包在ESM中的有效执行，因为use-sync-external-store这个包最终打包只导出了CJS
 * 等use-sync-external-store什么时候更新版本导出ESM模块的时候再更新吧
 */
const { useSyncExternalStore } = useSyncExternalStoreExports;

/**
 * createStore
 * created by liushanbao
 * @description 创建一个可全局使用的状态存储容器
 * 初始化状态编写的时候最好加上一个自定义的准确的泛型类型，
 * 虽然resy会有类型自动推断，但是对于数据状态类型可能变化的情况下还是不够准确的
 * @author liushanbao
 * @date 2022-05-05
 * @param initialState 初始化状态数据
 * @param options 状态容器配置项
 */
export function createStore<S extends State>(
  initialState?: S,
  options?: CreateStoreOptions,
): Store<S> {
  /**
   * @description 做了一个假值兼容，本想兼容createStore()以及useConciseState()的，
   * 但这样刚好导致0、null、false、""、undefined、NaN都可以了
   * 但事实上我最大程度允许的假值就是JS的undefined，因为必要条件下我不想写初始化参数
   * 例如：const { count, setState } = useConciseState<{ count?: number }>();
   * 或者：const store = createStore<{ count?: number }>();
   * 我可以不写初始化参数，即使在TS中我也可以只通过一个初始化的范型类型确定代码中我要使用的数据
   * 这样写法看起来像是凭空捏造了一个有效的数据状态，it`s looks cool!
   * 但同样除了undefined其他的假值可能是开发者的代码bug，如果都兼容了不太好
   */
  // 所以在这里的Object判断中只对undefined特殊处理
  const state = initialState === undefined ? ({} as S) : initialState;
  
  if (_DEV_ && Object.prototype.toString.call(state) !== "[object Object]") {
    throw new Error("The initialization parameter result of createStore needs to be an object!");
  }
  
  const { initialReset = true, __privatization__ } = options || {};
  
  /**
   * @description 更新的任务队列（私有化）、更新的任务数据（私有化）
   * 配合usePrivateStore该hook api的使用
   * 因为 "scheduler" 全局统一调度在如果作为私有状态的情况下
   * 会使得状态数据的更新针对每一个私有数据而失效
   * 只会对最后一个私有状态容器产生更新效果
   *
   * 这就需要私有的 "更新的任务队列（私有化）" 与 "更新的任务数据（私有化）"
   * 来解决每一个私有状态容器的有效更新的任务或者更新数据Map中的key不会因为相同而冲突的问题
   */
  const taskQueueMapPrivate = __privatization__ ? new Map<keyof S, Callback>() : null;
  const taskDataMapPrivate = __privatization__ ? new Map<keyof S, S[keyof S]>() : null;
  
  // 当前store的调度处理器
  const scheduler = schedulerProcessor();
  
  // 对应整个store的数据引用标记的set集合
  const storeRefSet = new Set<number>();
  
  // storeRefSet自增处理
  function storeRefSetSelfIncreasing() {
    const lastTemp = [...storeRefSet].at(-1);
    // 索引自增
    const lastItem = typeof lastTemp === "number" ? lastTemp + 1 : 0;
    // 做一个引用占位符，表示有一处引用，便于最后初始化逻辑执行的size判别
    storeRefSet.add(lastItem);
    return lastItem;
  }
  
  /**
   * @description 不改变传参state，同时resy使用Map与Set提升性能
   * 如stateMap、storeMap、storeCoreMap、storeChangeSet等
   */
  let stateMap: Map<keyof S, S[keyof S]> = new Map(Object.entries(state));
  // stateMap是否在view中整体重置过的的标记
  let stateMapViewResetFlag: boolean | undefined;
  // 复位stateMapViewResetFlag标记
  function stateMapViewResetHandled() {
    if (initialReset && stateMapViewResetFlag && !storeRefSet.size) {
      stateMapViewResetFlag = false;
    }
  }
  
  // 重置初始化stateMap状态
  function resetStateMap(key: keyof S) {
    Object.prototype.hasOwnProperty.call(state, key)
      ? stateMap.set(key, state[key])
      : stateMap.delete(key);
  }
  
  // setState的回调函数执行栈数组
  const setStateCallbackStackArray: SetStateCallbackItem<S>[] = [];
  
  // setState的回调函数添加入栈
  function setStateCallbackStackPush(updateParams: Partial<S>, cycleState: S, callback: SetStateCallback<S>) {
    setStateCallbackStackArray.push({
      cycleData: {
        updateParams,
        cycleState,
      },
      callback: (nextState) => callback(nextState),
    });
  }
  
  // 订阅监听Set容器
  const listenerStoreSet = new Set<CustomEventListener<S>>();
  
  // 处理store的监听订阅、ref数据引用关联、view数据关联以及获取最新state数据的相关核心处理Map
  const storeCoreMap: StoreCoreMapType<S> = new Map();
  storeCoreMap.set("getStateMap", () => stateMap);
  storeCoreMap.set("viewInitialReset", () => {
    if (initialReset && !stateMapViewResetFlag && !storeRefSet.size) {
      stateMapViewResetFlag = true;
      /**
       * view初始化的时候执行直接一次性覆盖即可，
       * 而如果是在useSyncExternalStore的初始化中执行则按key逐个执行初始化重置
       * 主要是view初始化一开始拿不到全部的数据引用，
       * 而useSyncExternalStore使用的时候可以拿到具体的数据引用
       */
      stateMap = new Map(Object.entries(state));
    }
  });
  storeCoreMap.set("viewConnectStore", () => {
    const storeRefIncreaseItem = storeRefSetSelfIncreasing();
    return () => {
      storeRefSet.delete(storeRefIncreaseItem);
      stateMapViewResetHandled();
    }
  });
  storeCoreMap.set("dispatchStoreEffect", (effectData: Partial<S>, prevState: S, nextState: S) => {
    /**
     * 这里虽然addEventListener监听的listener每一个都触发执行了，
     * 但是内部的内层listener会有数据变化的判断来实现进一步的精准定位变化执行
     * 表面上好像使用Map进行优化，避免全部循环在内层判断，尝试直接在外层判断精准执行一次
     * 但实际上可能存在不同组件多次监听同一个数据变化但是处理不同的业务逻辑的可能
     * 所以使用Set相对于Map而言是必要的，可以满足这种复杂的业务场景
     */
    listenerStoreSet.forEach(item => item.dispatchEvent(
      EVENT_TYPE,
      effectData,
      prevState,
      nextState,
    ));
  });
  
  // 数据存储容器storeMap
  const storeMap: StoreMap<S> = new Map();
  
  // 生成storeMap键值对
  function genStoreMapKeyValue(key: keyof S) {
    /**
     * @description 为每一个数据的change更新回调做一个闭包Set储存
     * 之所以用Set不用Map是因为每一个使用数据字段
     * 都需要一个subscribe的强更新绑定回调
     * 而每一个绑定回调函数是针对组件对于数据使用的更新开关
     */
    const storeChangeSet = new Set<Callback>();
    
    const storeMapValue: StoreMapValue<S> = new Map();
    storeMapValue.set("subscribe", (storeChange: Callback) => {
      storeChangeSet.add(storeChange);
      const storeRefIncreaseItem = storeRefSetSelfIncreasing();
      return () => {
        storeChangeSet.delete(storeChange);
        storeRefSet.delete(storeRefIncreaseItem);
        stateMapViewResetHandled();
      };
    });
    
    storeMapValue.set("getSnapshot", () => stateMap.get(key));
    
    storeMapValue.set("setSnapshot", (val: S[keyof S]) => {
      /**
       * @description 考虑极端复杂的情况下业务逻辑有需要更新某个数据为函数，或者本身函数也有变更
       * 同时使用Object.is避免一些特殊情况，虽然实际业务上设置值为NaN/+0/-0的情况并不多见
       */
      if (!Object.is(val, stateMap.get(key))) {
        // 这一步是为了配合getSnapshot，使得getSnapshot可以获得最新值
        stateMap.set(key, val);
        // 这一步才是真正的更新数据，通过useSyncExternalStore的内部变动后强制更新来刷新数据驱动页面更新
        storeChangeSet.forEach(storeChange => storeChange?.());
      }
    });
    
    storeMapValue.set("useSnapshot", () => {
      /**
       * @description 通过storeRefSet判断当前数据是否还有组件引用
       * 只要还有一个组件在引用当前数据，都不会重置数据，
       * 因为当前还在业务逻辑中，不属于完整的卸载
       * 完整的卸载周期对应表达的是整个store的
       *
       * 原本将初始化重置放在subscribe中不稳定，
       * 可能形成数据更新的撕裂，放在useSnapshot中使用useMemo同步执行一次安全温度
       *
       * 且也不能放在subscribe的return回调中卸载执行，以防止外部接口调用数据导致的数据不统一
       */
      if (initialReset && !stateMapViewResetFlag && !storeRefSet.size) {
        resetStateMap(key);
      }
      return useSyncExternalStore(
        (storeMap.get(key) as StoreMapValue<S>).get("subscribe") as StoreMapValueType<S>["subscribe"],
        (storeMap.get(key) as StoreMapValue<S>).get("getSnapshot") as StoreMapValueType<S>["getSnapshot"],
        (storeMap.get(key) as StoreMapValue<S>).get("getSnapshot") as StoreMapValueType<S>["getSnapshot"],
      );
    });
    
    storeMap.set(key, storeMapValue);
  }
  
  // 为每一个数据字段储存连接到store容器中
  function initialValueConnectStore(key: keyof S) {
    // 解决初始化属性泛型有?判断符，即一开始没有初始化的数据属性
    if (storeMap.has(key)) return storeMap;
    genStoreMapKeyValue(key);
    return storeMap;
  }
  
  // 批量触发订阅监听的数据变动
  function batchDispatchListener(prevState: Map<keyof S, S[keyof S]>, changedData: MapPartial<S>) {
    if (changedData.size > 0 && listenerStoreSet.size > 0) {
      /**
       * @description effectState：实际真正影响变化的数据
       * changedData是给予更新变化的数据，但是不是真正会产生变化影响的数据，
       * 就好比setState中的参数对象可以写与原数据一样数据，但是不产生更新
       */
      const effectState = {} as Partial<S>;
      
      [...changedData.entries()].forEach(([key, value]) => {
        if (!Object.is(value, prevState.get(key))) {
          effectState[key as keyof S] = stateMap.get(key);
        }
      });
      
      (
        storeCoreMap.get("dispatchStoreEffect") as StoreCoreMapValue<S>["dispatchStoreEffect"]
      )(effectState, mapToObject(stateMap), mapToObject(prevState));
    }
  }
  
  /**
   * @description 更新任务添加入栈
   * be careful：因为考虑到不知道什么情况的业务逻辑需要函数作为数据属性来进行更新
   * 所以这里没有阻止函数作为数据属性的更新
   */
  function taskPush(key: keyof S, val: S[keyof S]) {
    (scheduler.get("add") as Scheduler<S>["add"])(
      () => (
        (
          initialValueConnectStore(key).get(key) as StoreMapValue<S>
        ).get("setSnapshot") as StoreMapValueType<S>["setSnapshot"]
      )(val),
      key,
      val,
      taskDataMapPrivate,
      taskQueueMapPrivate,
    );
  }
  
  /**
   * @description 最终批量处理（更新、触发）
   * 借助then的（微任务）事件循环实现数据与任务更新的执行都统一入栈，然后冲刷更新
   * 同时可以帮助React v18以下的版本实现React管理不到的地方自动批处理更新
   * 但是异步更新的批量处理也导致无法立即获取最新数据
   * 如果想要立即同步获取最新数据可以使用setState的回调
   * 由此可见为了实现批量更新与同步获取最新数据有点拆东墙补西墙的味道
   * 但好在setState的回调弥补了同步获取最新数据的问题
   */
  function finallyBatchHandle() {
    if (!scheduler.get("isUpdating")) {
      /**
       * @description 采用微任务结合开关标志控制的方式达到批量更新的效果，
       * 完善兼容了reactV18以下的版本在微任务、宏任务中无法批量更新的缺陷
       */
      scheduler.set("isUpdating", Promise.resolve().then(() => {
        scheduler.set("isUpdating", null);
        
        const { taskDataMap, taskQueueMap } = (scheduler.get("getTask") as Scheduler<S>["getTask"])(
          taskDataMapPrivate,
          taskQueueMapPrivate,
        );
        // 至此，这一轮数据更新的任务完成，立即清空冲刷任务数据与任务队列，腾出空间为下一轮数据更新做准备
        (scheduler.get("flush") as Scheduler<S>["flush"])(taskDataMapPrivate, taskQueueMapPrivate);
        if (taskDataMap.size !== 0) {
          // 未更新之前的数据
          const prevState = new Map(stateMap);
          batchUpdate(() => taskQueueMap.forEach(task => task()));
          if (listenerStoreSet.size) {
            batchDispatchListener(prevState, taskDataMap);
          }
        }
        
        /**
         * 先更新，再执行回调
         * 这样会导致如果是多个setState同步代码执行，
         * 则后续回调执行的时候第一个回调内通过store读取数据也可以获取后续更新的数据最新值
         * 而如果是setState的回调中嵌套执行了setState，内部嵌套的setState再次有可执行回调
         * 则第一轮回调无法获取第二轮更新的数据最新值，这也是符合逻辑的
         * 与此同时，这两点与class组件的this.setState的回调效果是一致的，
         * 而setState的回调callback的参数nextState的存在
         * 就是为了解决事实上多个setState同步代码执行存在store读取数据产生最新数据值的问题
         * 可见react中的class组件的this.setState的回调函数也是通过大致执行入栈出栈的思路完成的
         */
        setStateCallbackStackArray.forEach((
          {callback, cycleData: { updateParams, cycleState }}, index, array,
        ) => {
          scheduler.set("isCalling", true);
          // 结合上一轮的回调进行上一轮更新参数的合并得到最新的回调数据参数
          callback(Object.assign(
            {},
            cycleState,
            index === 0 ? updateParams : array[index - 1].cycleData.updateParams,
          ));
          if (index === array.length - 1) scheduler.set("isCalling", null);
        });
        // 清空回调执行栈，否则回调中如果有更新则形成死循环
        setStateCallbackStackArray.splice(0);
      }));
    }
  }
  
  /**
   * 同步更新
   * @description todo 更多意义上是为了解决input无法输入非英文语言bug的无奈，后续待优化setState与单次更新
   */
  function syncUpdate(updateParams: Partial<S> | StateFunc<S>) {
    updateDataErrorHandle(updateParams, "syncUpdate");
    let updateParamsTemp = updateParams as Partial<S>;
    if (typeof updateParams === "function") {
      updateParamsTemp = (updateParams as StateFunc<S>)();
    }
    const prevState = new Map(stateMap);
    batchUpdate(() => {
      Object.keys(updateParamsTemp).forEach(key => {
        (
          (
            initialValueConnectStore(key).get(key) as StoreMapValue<S>
          ).get("setSnapshot") as StoreMapValueType<S>["setSnapshot"]
        )((updateParamsTemp as Partial<S> | S)[key]);
      });
    });
    if (listenerStoreSet.size) {
      batchDispatchListener(prevState, new Map(Object.entries(updateParamsTemp)) as MapPartial<S>);
    }
  }
  
  // 更新函数入栈
  function updater(updateParams: Partial<S> | StateFunc<S>) {
    if (typeof updateParams !== "function") {
      // 对象方式更新直接走单次直接更新的添加入栈，后续统一批次合并更新
      Object.keys(updateParams).forEach(key => {
        taskPush(key, (updateParams as Partial<S> | S)[key]);
      });
      return updateParams;
    } else {
      /**
       * @description
       * 1、如果stateParams是函数的情况并且在函数中使用了直接更新的方式更新数据
       * 那么这里需要先调用stateParams函数，产生一个直接更新的新一轮的批次更新
       * 然后再直接检查产生的直接更新中这一轮的批次中的最新任务数据与任务队列，然后进行冲刷与更新
       *
       * 2、如果stateParams函数中不是使用直接更新的方式，
       * 而是又使用了setState，那么会走到else分支仍然批量更新
       * 因为如果是函数入参里面更新肯定通过scheduler调度统一共用到单次直接更新的逻辑，
       * 不管它当前更新层是否使用，它最终总归会使用到单次直接更新的批量合并这一步
       *
       * 3、并且这种函数入参的更新具有更高效完善的合并优势，
       * "即函数入参内部的更新触发的订阅函数内的更新会统一成一个批次更新"
       * 它是凭借这种方式的 "执行时效" 并结合unstable_batchedUpdates内部的批处理实现
       * "执行时效" 在于触发的订阅函数内的更新会随着第一次setState函数更新的then而冲刷更新掉
       * 而这个冲刷更新与前一个函数入参内的更新的时间间隔仅有4ms以内左右
       * 而之所以这样前后冲刷的间隔只有4ms以内左右，
       * 是因为它相对于常规而言少经历了订阅函数内部更新的一个promise函数的执行
       * 而promise函数在底层实现中还是较为复杂的，需要的代码时耗也有几毫秒
       * 刚好常规而言的订阅联动更新就在这几毫秒的差距中就实现了批次处理的分水岭
       * 而4ms左右这样的一个时间间隔
       * 在react中就会被unstable_batchedUpdates或者react内部的调度机制处理成统一批次的更新
       * be careful：当然这里的特性是在react-V18中才有的，因为react-V18的unstable_batchedUpdates做了优化
       * 如果是react-V18以下的版本，则还是分两个批次渲染更新。
       */
      const updateParamsTemp = (updateParams as StateFunc<S>)();
      Object.keys(updateParamsTemp).forEach(key => {
        taskPush(key, (updateParamsTemp as S)[key]);
      });
      return updateParamsTemp;
    }
  }
  
  // 可对象数据更新的函数（可理解为class组件中的this.setState函数）
  function setState(updateParams: Partial<S> | StateFunc<S>, callback?: SetStateCallback<S>) {
    updateDataErrorHandle(updateParams, "setState");
    const updateParamsTemp = updater(updateParams);
    // 异步回调添加入栈
    if (callback) {
      const nextStateTemp = Object.assign({}, mapToObject(stateMap), updateParamsTemp);
      // 如果是回调在执行时发现回调中有更setState并且有回调，此时回调进入下一个微任务循环中添加入栈，不影响这一轮的回调执行栈的执行
      scheduler.get("isCalling")
        ? Promise.resolve().then(() => {
          setStateCallbackStackPush(updateParamsTemp, nextStateTemp, callback);
        })
        : setStateCallbackStackPush(updateParamsTemp, nextStateTemp, callback);
    }
    finallyBatchHandle();
  }
  
  // 订阅函数
  function subscribe(listener: Listener<S>, stateKeys?: (keyof S)[]): Unsubscribe {
    const customEventDispatcher: CustomEventListener<S> = new EventDispatcher();
    customEventDispatcher.addEventListener(
      /**
       * @description 每一个订阅监听实例有相同的event-type不要紧，因为实例不同所以不会影响
       * 这里取一个实例类型常量反而方便节省内存、增加代码执行效率
       */
      EVENT_TYPE,
      (effectState, nextState, prevState) => {
        let includesFlag = false;
        const listenerKeysIsEmpty = stateKeys === undefined || !(stateKeys && stateKeys.length !== 0);
        if (!listenerKeysIsEmpty && Object.keys(effectState).some(key => stateKeys.includes(key))) includesFlag = true;
        /**
         * 事实上最终订阅触发时，每一个订阅的这个外层listener都被触发了，
         * 只是这里在最终执行内层listener的时候做了数据变化的判断才实现了subscribe中的listener的是否执行
         */
        if (listenerKeysIsEmpty || (!listenerKeysIsEmpty && includesFlag)) listener(effectState, nextState, prevState);
      },
    );
    
    listenerStoreSet.add(customEventDispatcher);
    
    return () => {
      customEventDispatcher.removeEventListener(EVENT_TYPE)
      listenerStoreSet.delete(customEventDispatcher);
    };
  }
  
  // 单个属性数据更新
  function singlePropUpdate(_: S, key: keyof S, val: S[keyof S]) {
    taskPush(key, val);
    finallyBatchHandle();
    return true;
  }
  
  /**
   * 防止有对象继承了createStore生成的代理对象，
   * 同时initialState属性中又有 "属性描述对象" 的get (getter) 或者set (setter) 存取器 的写法
   * 会导致proxy中的receiver对象指向的this上下文对象变化
   * 使得 get / set 所得到的数据产生非期望的数据值
   * set不会影响数据，因为set之后会从proxy的get走，所以只要控制好get即可保证数据的正确性
   * @description be careful：为了避免原型链继承导致的需要Reflect.get
   * 从继承者对象自身获取setState等同名重写函数影响createStore本身的逻辑
   * 所以这里this只代理数据层，不包含函数层（setState、syncUpdate、subscribe）
   */
  function proxyReceiverThisHandle(proxyReceiver: any, proxyStore: any, target: S, key: keyof S) {
    return proxyStore === proxyReceiver
      ? stateMap.get(key)
      : Reflect.get(target, key, proxyReceiver);
  }
  
  // 代理函数内部的this指向对象的proxy代理对象
  const funcInnerThisProxyStore = new Proxy(state, {
    get(target: S, key: keyof S, receiver: any) {
      /**
       * 这里不用担心如果再次代理到函数怎么办，因为这里再次代理到函数肯定是上次bind了funcInnerThisProxyStore才走到这里的
       * 而bind函数的内部this指向的函数内部的this指向都会是bind的this对象，所以刚好形成良性this上下文循环
       */
      return proxyReceiverThisHandle(receiver, funcInnerThisProxyStore, target, key);
    },
    set: singlePropUpdate,
  } as ProxyHandler<S>) as S;
  
  // setState、subscribe与syncUpdate以及store代理内部数据Map的合集
  const externalMap: ExternalMapType<S> = new Map();
  
  // 给useStore的驱动更新代理
  const storeProxy = new Proxy(storeMap, {
    get(_, key: keyof S) {
      if (typeof stateMap.get(key) === "function") {
        return (stateMap.get(key) as AnyFn).bind(funcInnerThisProxyStore);
      }
      return externalMap.get(key as keyof ExternalMapValue<S>)
        || (
          (
            (
              initialValueConnectStore(key) as StoreMap<S>
            ).get(key) as StoreMapValue<S>
          ).get("useSnapshot") as StoreMapValueType<S>["useSnapshot"]
        )();
    },
  } as ProxyHandler<StoreMap<S>>);
  
  externalMap.set("setState", setState);
  externalMap.set("syncUpdate", syncUpdate);
  externalMap.set("subscribe", subscribe);
  
  const conciseExternalMap = new Map(externalMap) as ConciseExternalMapType<S>;
  
  /**
   * @description 给useConciseState的store代理的额外的store代理，
   * 同时store不仅仅是单纯的数据读取操作，set/sync/sub三个函数的使用一样可以，
   * 并且也让store具有单个数据属性更新的能力
   * 与createStore生成的store具有一样的功能
   * be careful: 这样主要是为了解决react的useState中产生的数据不具有可追溯性的问题
   * 比如在某些函数中因为因为或者作用域的不同导致函数内部再次获取useState的数据会不准确
   * 而使用这个额外的store来读取数据可以具有追溯性得到最新的数据状态
   */
  const conciseExtraStoreProxy = new Proxy(state, {
    get(target, key: keyof S, receiver: any) {
      if (typeof stateMap.get(key) === "function") {
        return (stateMap.get(key) as AnyFn).bind(funcInnerThisProxyStore);
      }
      return conciseExternalMap.get(key as keyof ConciseExternalMapValue<S>)
        || proxyReceiverThisHandle(receiver, conciseExtraStoreProxy, target, key);
    },
    set: singlePropUpdate,
  } as ProxyHandler<S>) as Store<S>;
  
  conciseExternalMap.set("store", conciseExtraStoreProxy);
  
  // 给useConciseState的驱动更新代理，与useStore分离开来，避免useStore中解构读取store产生冗余
  const conciseStoreProxy = new Proxy(storeMap, {
    get(_, key: keyof S) {
      if (typeof stateMap.get(key) === "function") {
        return (stateMap.get(key) as AnyFn).bind(funcInnerThisProxyStore);
      }
      return conciseExternalMap.get(key as keyof ConciseExternalMapValue<S>) || (
        (
          (
            initialValueConnectStore(key) as StoreMap<S>
          ).get(key) as StoreMapValue<S>
        ).get("useSnapshot") as StoreMapValueType<S>["useSnapshot"]
      )();
    },
  } as ProxyHandler<StoreMap<S>>);
  
  externalMap.set(STORE_CORE_MAP_KEY, storeCoreMap);
  externalMap.set(USE_STORE_KEY, storeProxy);
  externalMap.set(USE_CONCISE_STORE_KEY, conciseStoreProxy);
  
  const store = new Proxy(state, {
    get(target, key: keyof S, receiver: any) {
      if (typeof stateMap.get(key) === "function") {
        return (stateMap.get(key) as AnyFn).bind(funcInnerThisProxyStore);
      }
      return externalMap.get(key as keyof ExternalMapValue<S>)
        || proxyReceiverThisHandle(receiver, store, target, key);
    },
    set: singlePropUpdate,
  } as ProxyHandler<S>) as Store<S>;
  
  return store;
}
