import React from "react";
import { expect, test } from "vitest";
import { createStore, useConciseState, useStore } from "../src";
import { fireEvent, render, waitFor } from "@testing-library/react";

type State = {
  count: number;
  text?: string;
  value: string;
  name: string;
  test(): number;
};

test("unnormal1", async () => {
  const store = createStore<State>({
    count: 0,
    name: "resy-simple",
    get value() {
      return this.name;
    },
    test() {
      return this.count;
    }
  });

  const obj = {
    name: "Obj-FGH",
  };

  Object.setPrototypeOf(obj, store);

  // @ts-ignore
  expect(obj.test() === 0).toBeTruthy();

  // @ts-ignore
  expect(obj.value === "resy-simple").toBeTruthy();

  expect(() => {
    Object.setPrototypeOf(store, obj);
  }).toThrowError();

  const App = () => {
    const state = useStore(store);
    return (
      <>
        <p>{state.count}</p>
        <span>{state.text || ""}</span>
        <button onClick={() => {
          store.count++;
        }}>btn-1</button>
        <button onClick={() => {
          store.count++;
          store.setState({
            text: "test text",
          });
        }}>inc-btn</button>
      </>
    );
  };

  /** 测试初始化入参报错 start */
  // @ts-ignore
  expect(() => createStore(0)).toThrowError();
  // @ts-ignore
  expect(() => createStore(1)).toThrowError();
  // @ts-ignore
  expect(() => createStore(null)).toThrowError();
  // @ts-ignore
  expect(() => createStore(false)).toThrowError();
  // @ts-ignore
  expect(() => createStore(NaN)).toThrowError();
  // @ts-ignore
  expect(() => createStore("")).toThrowError();
  // @ts-ignore
  expect(() => createStore([])).toThrowError();
  // @ts-ignore
  expect(() => createStore(Symbol("empty-symbol"))).toThrowError();
  expect(() => createStore(new Set())).toThrowError();
  // @ts-ignore
  expect(() => createStore(new Map())).toThrowError();
  // @ts-ignore
  expect(() => createStore(new WeakSet())).toThrowError();
  // @ts-ignore
  expect(() => createStore(new WeakMap())).toThrowError();
  // @ts-ignore
  expect(() => createStore(new WeakRef())).toThrowError();
  /** 测试初始化入参报错 end */

  /** 测试初始化options入参报错 start */
  // @ts-ignore
  expect(() => createStore({}, 0)).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, 1)).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, null)).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, false)).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, NaN)).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, "")).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, {})).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, [])).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, Symbol("empty-symbol"))).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, new Set())).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, new Map())).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, new WeakSet())).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, new WeakMap())).toThrowError();
  // @ts-ignore
  expect(() => createStore({}, new WeakRef())).toThrowError();
  /** 测试初始化options入参报错 end */

  /** 测试store类型报错 start */
  // @ts-ignore
  expect(() => useStore(123)).toThrowError();
  // @ts-ignore
  expect(() => useStore("123")).toThrowError();
  // @ts-ignore
  expect(() => useStore({})).toThrowError();
  // @ts-ignore
  // eslint-disable-next-line no-empty-function,@typescript-eslint/no-empty-function
  expect(() => useStore(() => {})).toThrowError();
  // @ts-ignore
  expect(() => useStore([])).toThrowError();
  // @ts-ignore
  expect(() => useStore(null)).toThrowError();
  // @ts-ignore
  expect(() => useStore(undefined)).toThrowError();
  // @ts-ignore
  expect(() => useStore(new Symbol())).toThrowError();
  // @ts-ignore
  expect(() => useStore(NaN)).toThrowError();
  // @ts-ignore
  expect(() => useStore(true)).toThrowError();
  // @ts-ignore
  expect(() => useStore(new Map())).toThrowError();
  // @ts-ignore
  expect(() => useStore(new Set())).toThrowError();
  // @ts-ignore
  expect(() => useStore(new WeakMap())).toThrowError();
  // @ts-ignore
  expect(() => useStore(new WeakSet())).toThrowError();
  // @ts-ignore
  expect(() => useStore(new WeakRef())).toThrowError();
  /** 测试store类型报错 end */

  /** 测试store类型报错 start */
  // @ts-ignore
  expect(() => useConciseState(123)).toThrowError();
  // @ts-ignore
  expect(() => useConciseState("123")).toThrowError();
  // @ts-ignore
  expect(() => useConciseState({})).toThrowError();
  // @ts-ignore
  // eslint-disable-next-line no-empty-function,@typescript-eslint/no-empty-function
  expect(() => useConciseState(() => {})).toThrowError();
  // @ts-ignore
  expect(() => useConciseState([])).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(null)).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(undefined)).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new Symbol())).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(NaN)).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(true)).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new Map())).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new Set())).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new WeakMap())).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new WeakSet())).toThrowError();
  // @ts-ignore
  expect(() => useConciseState(new WeakRef())).toThrowError();
  /** 测试store类型报错 end */

  const { getByText } = render(<App />);

  fireEvent.click(getByText("btn-1"));
  await waitFor(() => {
    getByText("1");
  });

  fireEvent.click(getByText("inc-btn"));
  await waitFor(() => {
    getByText("2");
  });
});
