<div align="center">
<img src="./resy-logo.svg" alt="resy">
<h3>react state manager</h3>
<h4>Support React Native、Mini Apps</h4>

[![GitHub license](https://img.shields.io/github/license/lsbFlying/resy?style=flat-square)](https://github.com/lsbFlying/resy/blob/master/LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/lsbFlying/resy/test.yml?branch=master&color=blue&style=flat-square)](https://github.com/lsbFlying/resy/actions/workflows/test.yml)
[![Codecov](https://img.shields.io/codecov/c/github/lsbFlying/resy?style=flat-square)](https://codecov.io/gh/lsbFlying/resy)
[![npm type definitions](https://img.shields.io/npm/types/typescript?color=orange&style=flat-square)](https://github.com/lsbFlying/resy/blob/master/src/index.ts)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/resy?color=brightgreen&style=flat-square)](https://bundlephobia.com/result?p=resy)
[![react](https://img.shields.io/badge/React-%3E%3D16.8.0-green.svg?style=flat-square)](https://img.shields.io/badge/React-%3E%3D16.0.0-green.svg?style=flat-square)
[![npm](https://img.shields.io/npm/v/resy?color=blue&style=flat-square)](https://www.npmjs.com/package/resy)

</div>

### Features
- 😎 Easy!!!
- 😎 Support for class and hook
- 😎 Better performance optimization

### Install
```sh
npm i resy

# yarn add resy
# pnpm add resy
```

### Usage
```tsx
import { createStore, useStore, ComponentWithStore } from "resy";

const store = createStore({ count: 0 });

// for hook component
function App() {
  const { count } = useStore(store);  // or store.useStore();
  return (
    <>
      {count}
      <button onClick={() => store.count++}>increase</button>
    </>
  );
}

// for class component
class AppClass extends ComponentWithStore {
  
  store = this.connectStore(store);
  
  render() {
    const { count } = this.store;
    return (
      <>
        {count}
        <button onClick={() => { store.count++; }}>increase</button>
      </>
    );
  }
}
```

[![Edit on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/resy-igo13u?file=/src/App.js)

## Basic API
resy requires the version of React v >= 16.8

| API             | Description                                                  |
|-----------------|--------------------------------------------------------------|
| createStore     | Create a store container for state                           |
| useStore        | Use state from the store container generated by createStore  |
| setState        | Update data                                                  |
| syncUpdate      | Synchronously update data                                    |

### Detailed introduction of api

<details>
<summary>
createStore
</summary>

##### the store returned by createStore can be shared globally
```tsx
const demoStore1 = createStore({
  count: 0,
  text: "hello",
});
```

##### paradigm type
```tsx
type DemoStateType = { count: number; text?: number | string };
// In this way, the type of text can be
// more accurately identified as number or string or undefined
const demoStore2 = createStore<DemoStateType>({
  count: 0,
});
```

##### function return
```tsx
// This is a very important feature for retrieving the latest time or other data.
const demoStore3 = createStore(() => {
  return {
    count: 0,
    time: Date.now(),
  };
});
```

##### initial function attribute
```tsx
const demoStore4 = createStore({
  count: 0,
  increase() {
    // this point store object, as follows example
    // The updates and usage of these APIs will be detailed in subsequent chapters
    this.count++;
    // this.setState({ count: this.count + 1 });
    // this.restore();
    
    // demoStore4.count++;
    // demoStore4.setState({ count: demoStore3.count + 1 });
  },
});
```

##### general use
```tsx
import { createStore } from "resy";

type StateType = {
  count: number;
  text: string;
  info: { name: string };
  ageList: { age: number }[];
  increase(): void;
  inputValue?: string;
};

// The generated store can be shared globally
const store = createStore<StateType>({
  count: 0,
  text: "hello",
  info: { name: "Jack" },
  ageList: [{age: 12}, { age: 16 }],
  increase() {
    this.count++;
  },
});
```

##### createStore options item - unmountRestore
```tsx
// Store such as login and theme can set unmountRestore to false
// so that it will not be reset globally.
const userStore = createStore<{ userName: string; userId: number }>(
  {
    userName: "wenmu",
    userId: 0,
  },
  {
    unmountRestore: false,
  },
);
const themeStore = createStore<{ themeStyle: "dark" | "light" }>(
  {
    themeStyle: "dark",
  },
  {
    unmountRestore: false,
  },
);
```
</details>

<details>
<summary>useStore</summary>

##### deconstruction usage mode
```tsx
import { useStore } from "resy";

function App() {
  const { count, text } = useStore(store);
  // or
  // const { count, text } = store.useStore();
  
  return (
    <>
      <p>{count}</p>
      <p>{text}</p>
    </>
  );
}
```

##### Mixed use of store
```tsx
import { useStore } from "resy";

function App() {
  const { userName } = userStore.useStore();
  const { themeStyle } = themeStore.useStore();
  
  return (
    <>
      <p>{userName}</p>
      <p>{themeStyle}</p>
      <button onClick={() => { userStore.userName = "LF" }}>nameChange</button>
      <button onClick={() => { themeStore.setState({ themeStyle: "light" }) }}>themeChange</button>
    </>
  );
}
```

##### direct read usage mode
```tsx
import { useStore } from "resy";

function App() {
  const state = store.useStore();
  
  return (
    <>
      <p>{state.count}</p>
      <p>{state.text}</p>
    </>
  );
}
```

##### The method of deconstructing StoreUtils
<details>
<summary>
setState, syncUpdate, restore, subscribe,
</summary>
the four methods of StoreUtils are setState, syncUpdate,
restore and subscribe, it can be deconstructed and used directly
from useStore, but store itself has these four methods,
which are described in more detail in the following sections.
</details>

```tsx
import { useStore } from "resy";

function App() {
  const {
    count, text,
    // The use of these api will be described in detail later.
    setState, syncUpdate, restore, subscribe,
  } = store.useStore();
  
  return (
    <>
      <p>{count}</p>
      <p>{text}</p>
    </>
  );
}
```

##### direct assignment update
```tsx
import { useStore } from "resy";

function App() {
  const { count, text } = store.useStore();
  
  // Updates can be assigned directly
  function btn2() {
    store.count++;
    store.text = "456asd";
  }
  
  return (
    <>
      <p>{count}</p>
      <p>{text}</p>
    </>
  );
}
```

</details>

<details>
<summary>Using in class components</summary>

##### ComponentWithStore、PureComponentWithStore
```tsx
import { ComponentWithStore, PureComponentWithStore } from "resy";

/**
 * @description ComponentWithStore is inherited from React Component,
 * PureComponentWithStore is inherited from React PureComponent;
 */
class AppClass extends ComponentWithStore {

  store = this.connectStore(store);

  render() {
    const { count } = this.store;
    return (
      <>
        {count}
        <button onClick={() => { store.count++; }}>button +</button>
      </>
    );
  }
}

class PureAppClass extends PureComponentWithStore {

  store = this.connectStore(store);

  render() {
    const { count } = this.store;
    return (
      <>
        {count}
        <button onClick={() => { store.count++; }}>button +</button>
      </>
    );
  }
}
```

##### Mixed use of store

```tsx
import { ComponentWithStore, createStore } from "resy";

/**
 * @description The update methods of internal "this.userStore" and "this.themeStore"
 * are the same as those of the connected store itself, and can be called directly.
 */
class AppClass extends ComponentWithStore {

  userStore = this.connectStore(userStore);

  themeStore = this.connectStore(themeStore);

  render() {
    const { userName } = this.userStore;
    const { theme } = this.themeStore;
    return (
        <>
          <span>{userName}</span>
          <span>{theme}</span>
          <button onClick={() => { this.userStore.userName = "LD" }}>
            nameChange
          </button>
          <button onClick={() => { this.themeStore.setState({ theme: "light" }) }}>
            themeChange
          </button>
        </>
    );
  }
}
```

</details>

<details>
<summary>
Invalid update
</summary>

```tsx
import { useStore } from "resy";

function App() {
  const {
    info: { name }, ageList, inputValue,
  } = store.useStore();
  
  function btn2() {
    // store.info.name = "Jack";   // Invalid update
    // store.ageList[0] = { age: 7 };   // Invalid update
    
    store.info = { name: "Jack" }; // Effective update
    store.ageList = [{age: 7}];   // Effective update
  }
  
  return (
    <>
      <p>{name}</p>
      {ageList.map(item => `Age：${item}`)}<br/>
      <button onClick={btn2}>btn2</button>
    </>
  );
}
```

</details>

<details>
<summary>setState</summary>

```tsx
import { useStore } from "resy";

function App() {
  const { count, text } = store.useStore();
  
  return (
    <>
      <div>{count}</div>
      <div>{text}</div>
      <button
        onClick={() => {
          store.setState({
            text: "demo-setState",
            count: count + 1,
          });
        }}
      >
        btn
      </button>
    </>
  );
}
```

##### setState's callback
```tsx
import { useStore } from "resy";

function App() {
  const { text } = store.useStore();
  
  return (
    <button
      onClick={() => {
        store.setState({
          text: "cur-text",
        }, nextState => {
          console.log(nextState.text === "cur-text"); // true
        });
      }}
    >
      {text}
    </button>
  );
}
```

##### parameters of callback for setState
the difference between the callback of setState
and the callback of this.setState of class components

* reading this.state in the callback function of this.setState
  in the class component obtains the latest data in the current round of updates.

```tsx
import { Component } from "react";

class TestClassX extends Component {
  constructor() {
    super();
    this.state = { count: 0, text: "class-x" };
  }
  
  render() {
    const { count, text } = this.state;
    return (
      <>
        {count},{text}
        <button
          onClick={() => {
            this.setState({
              text: "Try",
            }, () => {
              console.log(this.state.count === 9);  // true
            });
            this.setState({ count: 9 });
          }}
        >
          btn
        </button>
      </>
    );
  }
}
```  

* however, the nextState of the callback function
  of resy's setState is the latest data in the current synchronization phase,
  but it does not belong to the latest data after the final round of updates.
```tsx
import { useStore, createStore } from "resy";

const store = createStore({count: 0, text: "hello"});

function App() {
  const { text } = store.useStore();
  
  return (
    <button
      onClick={() => {
        store.setState({
          text: "cur-text",
        }, nextState => {
          console.log(nextState.text === "cur-text"); // true
          console.log(nextState.count === 0); // true
          console.log(store.count === 9); // true
        });
        store.setState({count: 9});
      }}
    >
      {text}
    </button>
  );
}
```

##### parameters of the function type of setState
```tsx
import { useStore } from "resy";

const store = createStore({count: 0, text: "hello"});

function App() {
  const { count, text } = store.useStore();
  
  function btnClick1() {
    store.setState(() => {
      // Returns the object that will eventually be updated
      // through the calculation of complex business logic
      return {
        count: count + 1,
        text: "B-Way-setState-with-function",
      };
    });
  }
  
  function btnClick2() {
    store.count = 9;
    // The prevState parameter of the function
    store.setState(prevState => {
      console.log(prevState.count === 9);  // true
      console.log(store.count === 9);  // true
      return {
        text: "ok",
      };
    });
  }
  
  return (
    <>
      <div>{count}</div>
      <div>{text}</div>
      <button onClick={btnClick1}>btn-1</button>
      <button onClick={btnClick2}>btn-2</button>
    </>
  );
}
```
</details>

<details>
<summary>syncUpdate</summary>

```tsx
import { useStore, syncUpdate } from "resy";

/**
 * @description 🌟 The main purpose of syncUpdate is to solve the problem
 * that input box updates such as input cannot be updated in an asynchronous environment.
 */
function App() {
  const { inputValue } = store.useStore();
  
  function inputChange(event: React.ChangeEvent<HTMLInputElement>) {
    store.syncUpdate({
      inputValue: event.target.value,
    });
    // @example B
    // store.syncUpdate(prevState => {
    //   // prevState is same as setState's prevState.
    //   return {
    //     inputValue: event.target.value,
    //   };
    // });
    // @example C
    // You can also use the callback function
    // store.syncUpdate({
    //   inputValue: event.target.value,
    // }, nextState => {
    //   console.log(nextState);
    // });
  }
  
  return (
    <input value={inputValue} onChange={inputChange}/>
  );
}
```
</details>

<details>
<summary>fine-grained of update</summary>

##### hook
```tsx
import { useStore } from "resy";

// Updates to count data will not cause Text components to re-render
function Text() {
  const { text } = store.useStore();
  return <p>{text}</p>;
}

// Updates to text data will not cause Count components to re-render
function Count() {
  const { count } = store.useStore();
  return <p>{count}</p>;
}

function App() {
  const { increase, name } = store.useStore();
  
  return (
    <>
      <Text/>
      <Count/>
      <div>{name}</div>
      <button onClick={() => { store.name = "app"; }}>btn-name</button>
      <button onClick={increase}>btn+</button>
      <button onClick={() => { store.count-- }}>btn-</button>
    </>
  );
}
```

##### class

```tsx
import { useStore, ComponentWithStore } from "resy";

// Updates to count data will not cause Text components to re-render
class TextClass extends ComponentWithStore {

  store = this.connectStore(store);
  
  render() {
    const { text } = this.store;
    return (
      <p>{text}</p>
    );
  }
}

// Updates to text data will not cause Count components to re-render
class CountClass extends ComponentWithStore {

  store = this.connectStore(store);

  render() {
    const { count } = this.store;
    return (
      <p>{count}</p>
    );
  }
}

class AppClass extends ComponentWithStore {

  store = this.connectStore(store);

  render() {
    const { increase, name } = this.store;
    return (
      <>
        <Text/>
        <Count/>
        <div>{name}</div>
        <button onClick={() => { store.name = "app" }}>btn-name</button>
        <button onClick={increase}>btn+</button>
        <button onClick={() => { store.count-- }}>btn-</button>
      </>
    );
  }
}
```

</details>

## Advanced API
| API             | Description                                                  |
|-----------------|--------------------------------------------------------------|
| useConciseState | Concise version of useState                                  |
| subscribe       | Subscribe for changes in store data generated by createStore |
| useSubscription | Hook of subscribe                                            |
| restore         | Restore data of store, with re-render effect                 |
| setOptions      | Set the options parameter of createStore                     |

### Detailed introduction of api

<details>
<summary>useConciseState</summary>

```tsx
import { useConciseState } from "resy";

const initialState = {
  count: 123,
  text: "hello-consice",
};

function App() {
  const { count, text, store, setState } = useConciseState(initialState);
  
  return (
    <>
      <div
        onClick={() => {
          setState({
             count: count + 1,
             text: "ASD",
          });
          // or
          // store.count++;
          // store.text = "ASD";
          // or
          // store.setState({
          //   count: count + 1,
          //   text: "ASD",
          // });
          // store has all the data of useConciseState
          // and the restore, syncUpdate, and subscribe methods
        }}
      >
        {count}
      </div>
      <div>{text}</div>
    </>
  );
}
```

restore、syncUpdate、subscribe these api can also be deconstructed and used directly.

```tsx
import { useEffect } from "react";
import { useConciseState } from "resy";

function App() {
  const { count, text, restore, syncUpdate, subscribe } = useConciseState(initialState);
  
  useEffect(() => {
    return subscribe(({ effectState }) => {
      console.log(effectState);
    }, ["text"]);
  }, []);
  
  return (
    <>
      <input
        value={text}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          syncUpdate({text: event.target.value});
        }}
      />
      <div onClick={() => restore()}>reset-btn</div>
      <div>{text}</div>
    </>
  );
}
```
</details>

<details>
<summary>subscribe、useSubscription</summary>

#### global subscribe
```tsx
// You can also subscribe to a non-lifecycle data monitor directly.
const unsub = store.subscribe(() => {
  // ... to do anything
}, ["count", "text"]);

// cancel subscirbe
// unsub();
```

#### empty keys
<details>
<summary>empty state keys</summary>
You can also not add an array of monitoring subscription data keys,
Both empty keys and no keys mean listening subscriptions to changes in the entire store data.
</details>

```tsx
store.subscribe(() => {
  // ... to do anything
}, []);
// [] or no state keys is equal
// no state keys
store.subscribe(() => {
  // ... to do anything
});
```

#### general use
```tsx
import { useEffect } from "react";
import { useStore } from "resy";

function App() {
  const { count } = store.useStore();
  
  // Here is an example of a function component.
  // If it is a class component, it can be used in componentDidMount.
  useEffect(() => {
    /**
     * @param listener: subscription monitoring callback function
     * @param stateKeys: subscription listens for changes in certain data fields of a specific store.
     * If empty, default listens for changes in any one of the data in store.
     * @return Unsubscribe: unsubscribe to the function of listening
     */
    const unsubscribe = store.subscribe(({
      effectState, prevState, nextState,
    }) => {
      /**
       * effectState：Currently changing data
       *   nextState：Data after change
       *   prevState：Data before change
       */
      console.log(effectState, prevState, nextState);
    }, ["count", "text"]);
    
    // unsubscribe();
    return () => {
      unsubscribe();
      // ... to do else anything
    };
  }, []);
  
  function btnClickA() {
    store.count++;
  }
	
  function btnClickB() {
    store.text = "control btn-b click update text state value";
  }
	
  function btnClickC() {
    store.setState({
      count: count + 1,
      text: "control btn-c click update text state value",
    });
  }
  
  return (
    <>
      <p>{count}</p>
      <button onClick={btnClickA}>btn-A</button><br/>
      <button onClick={btnClickB}>btn-B</button><br/>
      <button onClick={btnClickC}>btn-C</button>
    </>
  );
}
```

```tsx
import { useEffect } from "react";
import { useStore, useSubscription } from "resy";

function App() {
  const { count } = store.useStore();

  useSubscription(store, ({
    effectState, prevState, nextState,
  }) => {
    console.log(effectState, prevState, nextState);
  }, ["count"]);
  
  function btnClick() {
    store.count++;
  }
  
  return (
    <>
      <p>{count}</p>
      <button onClick={btnClick}>btn</button><br/>
    </>
  );
}
```

```tsx
import { useEffect } from "react";
import { useStore } from "resy";

function App() {
  const { count } = store.useStore();

  store.useSubscription(({
    effectState, prevState, nextState,
  }) => {
    console.log(effectState, prevState, nextState);
  }, ["count"]);
  
  function btnClick() {
    store.count++;
  }
  
  return (
    <>
      <p>{count}</p>
      <button onClick={btnClick}>btn</button><br/>
    </>
  );
}
```
</details>

<details>
<summary>restore</summary>

```tsx
import { useStore } from "resy";

function App() {
  const { count, text } = store.useStore();
  
  return (
    <>
      <div>{count}-{text}</div>
      <div
        onClick={() => {
          // data recover initial
          store.restore();
          // You can also add callback functions in the restore function
          // store.restore(nextState => {
          //   console.log(nextState);
          // });
        }}
      >
        reset-btn
      </div>
    </>
  );
}
```

```tsx
import { createStore, useStore } from "resy";

const timeStore = createStore(() => {
  return {
    now: Date.now(),
  };
});

function App() {
  const { now } = useStore(timeStore);
  
  return (
    <>
      <div>now:{now}</div>
      <div
        onClick={() => {
          // time data now recover and also changed initial,
          // because of initialState is function return.
          store.restore();
        }}
      >
        reset-btn
      </div>
    </>
  );
}
```
</details>

<details>
<summary>setOptions</summary>

```tsx
function App() {
  return (
    <button
      onClick={() => {
        // Use less scenes, use it with caution
        // You can change the unmountRestore parameter setting of createStore
        store.setOptions({ unmountRestore: false });
      }}
    >
      btn
    </button>
  );
}
```
</details>

### License
[MIT License](https://github.com/lsbFlying/resy/blob/master/LICENSE) (c) [刘善保](https://github.com/lsbFlying)

