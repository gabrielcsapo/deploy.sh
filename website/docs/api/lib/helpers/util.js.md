<a name="module_lib/helpers/util"></a>

## lib/helpers/util

- [lib/helpers/util](#module_lib/helpers/util)
  - _static_
    - [.mk](#module_lib/helpers/util.mk) ⇒ <code>Promise</code>
  - _inner_
    - [~getPort()](#module_lib/helpers/util..getPort) ⇒ <code>Promise</code>
    - [~hash(length)](#module_lib/helpers/util..hash) ⇒ <code>String</code>
    - [~contains(arr, contains)](#module_lib/helpers/util..contains) ⇒ <code>Boolean</code>

<a name="module_lib/helpers/util.mk"></a>

### lib/helpers/util.mk ⇒ <code>Promise</code>

makes a directory recursively

**Kind**: static constant of [<code>lib/helpers/util</code>](#module_lib/helpers/util)

| Param     | Type                | Description              |
| --------- | ------------------- | ------------------------ |
| directory | <code>String</code> | path to future directory |

<a name="module_lib/helpers/util..getPort"></a>

### lib/helpers/util~getPort() ⇒ <code>Promise</code>

gets an open port

**Kind**: inner method of [<code>lib/helpers/util</code>](#module_lib/helpers/util)  
<a name="module_lib/helpers/util..hash"></a>

### lib/helpers/util~hash(length) ⇒ <code>String</code>

gets a lowercase random string with specified length

**Kind**: inner method of [<code>lib/helpers/util</code>](#module_lib/helpers/util)

| Param  | Type                | Description                               |
| ------ | ------------------- | ----------------------------------------- |
| length | <code>Number</code> | the specified length of the random string |

<a name="module_lib/helpers/util..contains"></a>

### lib/helpers/util~contains(arr, contains) ⇒ <code>Boolean</code>

contains is a function that takes an array and see if the condition matches

**Kind**: inner method of [<code>lib/helpers/util</code>](#module_lib/helpers/util)  
**Returns**: <code>Boolean</code> - - responds back with a boolean value

| Param    | Type               | Description                                       |
| -------- | ------------------ | ------------------------------------------------- |
| arr      | <code>Array</code> | array to check with rules                         |
| contains | <code>Array</code> | rules to make sure the arr contains the following |

**Example**

```js
contains(
  ["index.html", "main.css"],
  ["index.html", "!Dockerfile", "!package.json"]
);
```
