import React from "react";
import { expect, test } from "vitest";
import { createStore, useStore, MapStateToProps, view } from "../src";
import { fireEvent, render, waitFor } from "@testing-library/react";

test("view2", async () => {

  type State = {
    count: number;
    text: string;
    value: string;
  };

  const store = createStore<State>({
    count: 0,
    text: "Hello",
    get value() {
      console.log("this", this);
      return this.text;
    },
  });

  class ClassCom extends React.PureComponent<MapStateToProps<State>> {
    render() {
      // view会将store数据挂载到props上新增的state属性上
      const { count } = this.props.state;
      // console.log(this.props.state);
      const obj = {
        text: "Obj-text",
      };
      // 无效继承，obj无法继承到props.state的数据属性或者方法
      Object.setPrototypeOf(obj, this.props.state);
      // @ts-ignore
      console.log("obj.value：", obj.value);
      // @ts-ignore
      expect(obj.value === "Obj-text").toBeFalsy();
      // @ts-ignore
      expect(obj.value === "Hello").toBeTruthy();

      return (
        <div>ViewClassComCount:{count}</div>
      );
    }
  }

  const ClassComView = view(ClassCom, { stores: store });

  function HookCom() {
    const { count } = useStore(store);
    return (
      <div>
        HookCom-count:{count}
      </div>
    );
  }

  const HookComView = view(HookCom, {
    equal: () => false,
  });

  const App = () => {
    const { text } = useStore(store);

    return (
      <div>
        <div>AppText:{text}</div>
        <ClassComView />
        <HookComView />
        <div>
          <button onClick={() => {
            store.count++;
            store.text = "OK";
          }}>btn1</button>
          <button onClick={() => {
            store.text = "Hello";
          }}>btn2</button>
        </div>
      </div>
    );
  };

  const { getByText } = render(<App />);

  fireEvent.click(getByText("btn1"));
  await waitFor(() => {
    getByText("AppText:OK");
    getByText("ViewClassComCount:1");
    getByText("HookCom-count:1");
  });

  fireEvent.click(getByText("btn2"));
  await waitFor(() => {
    getByText("AppText:Hello");
    getByText("HookCom-count:1");
  });
});