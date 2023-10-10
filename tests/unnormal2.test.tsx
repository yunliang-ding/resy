import React from "react";
import { expect, test } from "vitest";
import { createStore, useStore } from "../src";
import { fireEvent, render, waitFor } from "@testing-library/react";

type State = {
  count?: number;
  test: Function;
};

test("unnormal2", async () => {
  const store = createStore<State>({
    count: 0,
    test() {
      console.log(this.count);
    },
  });

  const App = () => {
    const { count } = useStore(store);
    return (
      <>
        <p>{count ?? 999}</p>
        <button onClick={() => {
          if (store.count !== undefined) store.count++;
        }}>btn-1</button>
        <button onClick={() => {
          delete store.count;
        }}>btn-2</button>
      </>
    );
  };

  const { getByText } = render(<App />);

  fireEvent.click(getByText("btn-1"));
  await waitFor(() => {
    getByText("1");
  });

  fireEvent.click(getByText("btn-2"));
  await waitFor(() => {
    getByText("999");
  });

  expect(() => {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sn = new store();
  }).toThrowError();
});