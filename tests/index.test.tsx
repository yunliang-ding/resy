import React, { useEffect } from "react";
import { test, expect } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { createStore, useStore } from "../src";

test("resy-basic", async () => {
  // 数据范型类型接口
  type Store = {
    count: number;
    text: string;
    testObj: { name?: string; age?: number };
    testArr: { age: number; name: string }[];
    testFun: () => void;
    sex?: "man" | "woman" | string;
  };
  
  // 生成的这个store可以全局共享，直接引入store即可
  const store = createStore<Store>(
    {
      count: 0,
      text: "123qwe",
      testObj: { name: "Paul" },
      testArr: [{age: 12, name: "Alen"}, { age: 16, name: "Frac" }],
      testFun: () => {
        store.count++;
        console.log("testFun");
      },
    },
    /**
     * 默认为true
     * true：默认模块卸载时自动恢复初始化数据状态
     * false：模块卸载时也不恢复初始化数据，保持数据状态
     * 常规使用场景设置为true即可
     * 特殊使用场景如login登录信息数据
     * 或theme主题数据属于全局状态数据可以设置为false
     */
    // false,
  );
  
  let index = 0;
  
  const App = () => {
    const { count, text, testFun, testObj, testArr, sex } = useStore(store);
    index++;
    useEffect(() => {
      const unsubscribe = store.subscribe((effectState, prevState, nextState) => {
        if (effectState.sex === "no-sex-subscribe") {
          console.log(prevState.sex, nextState.sex);
          store.count = 999;
        }
        if (effectState.text === "text-upgrade") {
          store.count = 999666;
        }
        if (effectState.text === "qweasdzxc") {
          store.testObj = { age: 12 };
        }
      }, ["sex", "text"]);
      return () => {
        unsubscribe();
        // 同时可以做一些其他的解除或者释放的操作
      };
    }, []);
    
    return (
      <>
        <p>{count}</p>
        <p>{text}</p>
        <p>{sex || "no-sex"}</p>
        <p>testObj-age:{testObj?.age}</p>
        <p>{testObj?.name || "batch-forEach"}</p>
        <p>{testArr[0]?.name}：{testArr[0]?.age}</p>
        <p>{testArr.map(item => `${item.name}：${item.age}`)}</p>
        <button onClick={testFun}>btn1</button>
        <button onClick={() => {
          store.count++;
          store.text = "456asd";
        }}>btn2</button>
        <button onClick={() => {
          store.testObj = {
            name: "Jack",
          };
        }}>btn3</button>
        <button onClick={() => {
          store.setState({
            sex: "man",
            count: store.count - 1,
            testArr: store.testArr.map(item => ({ ...item, age: --item.age }))
          });
        }}>btn4</button>
        <button onClick={() => {
          // 无效更新
          store.testObj.name = "Forrest Gump";
          // 无效更新
          store.testArr[0] = {age: 7, name: "Forrest Gump"};
        }}>btn5</button>
        <button onClick={() => {
          store.sex = undefined;
        }}>btn6</button>
        <button onClick={() => {
          store.setState(() => {
            const updateArr = ["count", "text", "testObj", "testArr"];
            updateArr.forEach(key => {
              // @ts-ignore
              store[key] = typeof store[key] === "number"
                ? 0
                // @ts-ignore
                : typeof store[key] === "string"
                  ? "qweasdzxc"
                  // @ts-ignore
                  : typeof store[key] === "boolean"
                    ? false
                    // @ts-ignore
                    : Object.prototype.toString.call(store[key]) === "[object Array]" ? [] : {};
            });
          });
        }}>btn7</button>
        <button onClick={() => {
          store.sex = "no-sex-subscribe";
        }}>btn8</button>
        <button onClick={() => {
          store.text = "text-upgrade";
        }}>btn9</button>
        <button onClick={() => {
          // 不产生更新
          store.setState(store);
        }}>btn10</button>
        <button onClick={() => {
          store.setState(async () => {
            setTimeout(async () => {
              store.count = 123;
              console.log("qweasd")
              await waitFor(() => {
                console.log(1, index === 13, index);
                expect(index === 128).toBeTruthy();
              });
            }, 0);
          }, async (nextState) => {
            // store.setState({
            //   count: nextState.count + 1,
            // });
            store.count = nextState.count + 1;
            expect(store.count === 124).toBeTruthy();
            await waitFor(() => {
              console.log(2, index === 14, index);
              expect(index === 14).toBeTruthy();
            });
          });
        }}>btn11</button>
      </>
    );
  };
  
  const { getByText, queryByText } = render(<App/>);
  
  fireEvent.click(getByText("btn1"));
  await waitFor(async () => {
    getByText("1");
  });
  
  fireEvent.click(getByText("btn2"));
  await waitFor(async () => {
    getByText("456asd");
  });

  fireEvent.click(getByText("btn3"));
  await waitFor(() => {
    getByText("Jack");
  });

  fireEvent.click(getByText("btn4"));
  await waitFor(() => {
    getByText("Alen：11");
    getByText("man");
  });

  fireEvent.click(getByText("btn5"));
  await waitFor(() => {
    console.log(queryByText("Forrest Gump"), queryByText("Forrest Gump：7"));
    expect(queryByText("Forrest Gump")).toBeNull();
    expect(queryByText("Forrest Gump：7")).toBeNull();
  });

  fireEvent.click(getByText("btn6"));
  await waitFor(() => {
    getByText("no-sex");
  });

  fireEvent.click(getByText("btn7"));
  await waitFor(() => {
    getByText("batch-forEach");
    getByText("testObj-age:12");
  });

  fireEvent.click(getByText("btn8"));
  await waitFor(() => {
    getByText("999");
    console.log("btn8", index); // btn8, 9
  });

  fireEvent.click(getByText("btn9"));
  await waitFor(() => {
    getByText("999666");
    console.log("btn9", index); // btn9, 11
  });
  
  fireEvent.click(getByText("btn10"));
  await waitFor(() => {
    console.log("btn10", index); // btn10, 11
    expect(index === 11).toBeTruthy();
  });
  
  fireEvent.click(getByText("btn11"));
  await waitFor(() => {
    console.log("btn11", index); // btn11, 11
    expect(index === 11).toBeTruthy();
  });
});
