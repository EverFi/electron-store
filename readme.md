# electron-store

> Simple data persistence for your [Electron](https://electronjs.org) app or module - Save and load user preferences, app state, cache, etc

Electron doesn't have a built-in way to persist user preferences and other data. This module handles that for you, so you can focus on building your app. The data is saved in a JSON file named config.json in [`app.getPath('userData')`](https://electronjs.org/docs/api/app#appgetpathname).

You can use this module directly in both the main and renderer process.

# When on Electron 10 or later, you need to enable the [`enableRemoteModule`](https://www.electronjs.org/docs/api/browser-window#new-browserwindowoptions) option to be able to use it directly in the renderer process.

## Install

```
$ npm install electron-store
```

*Requires Electron 7 or later.*

## Usage

```js
const Store = require('electron-store');

const store = new Store();

store.set('unicorn', '🦄');
console.log(store.get('unicorn'));
//=> '🦄'

// Use dot-notation to access nested properties
store.set('foo.bar', true);
console.log(store.get('foo'));
//=> {bar: true}

store.delete('unicorn');
console.log(store.get('unicorn'));
//=> undefined
```

## API

Changes are written to disk atomically, so if the process crashes during a write, it will not corrupt the existing config.

### Store(options?)

Returns a new instance.

### options

Type: `object`

#### defaults

Type: `object`

Default values for the store items.

**Note:** The values in `defaults` will overwrite the `default` key in the `schema` option.

#### schema

type: `object`

[JSON Schema](https://json-schema.org) to validate your config data.

Under the hood, the JSON Schema validator [ajv](https://github.com/epoberezkin/ajv) is used to validate your config. We use [JSON Schema draft-07](http://json-schema.org/latest/json-schema-validation.html) and support all [validation keywords](https://github.com/epoberezkin/ajv/blob/master/KEYWORDS.md) and [formats](https://github.com/epoberezkin/ajv#formats).

You should define your schema as an object where each key is the name of your data's property and each value is a JSON schema used to validate that property. See more [here](https://json-schema.org/understanding-json-schema/reference/object.html#properties).

Example:

```js
const Store = require('electron-store');

const schema = {
	foo: {
		type: 'number',
		maximum: 100,
		minimum: 1,
		default: 50
	},
	bar: {
		type: 'string',
		format: 'url'
	}
};

const store = new Store({schema});

console.log(store.get('foo'));
//=> 50

store.set('foo', '1');
// [Error: Config schema violation: `foo` should be number]
```

**Note:** The `default` value will be overwritten by the `defaults` option if set.

#### migrations

Type: `object`

You can use migrations to perform operations to the store whenever a version is upgraded.

The `migrations` object should consist of a key-value pair of `'version': handler`. The `version` can also be a [semver range](https://github.com/npm/node-semver#ranges).

Example:

```js
const Store = require('electron-store');

const store = new Store({
	migrations: {
		'0.0.1': store => {
			store.set('debugPhase', true);
		},
		'1.0.0': store => {
			store.delete('debugPhase');
			store.set('phase', '1.0.0');
		},
		'1.0.2': store => {
			store.set('phase', '1.0.2');
		},
		'>=2.0.0': store => {
			store.set('phase', '>=2.0.0');
		}
	}
});
```

> Note: The version the migrations use refers to the **project version** by default. If you want to change this behavior, specify the [`projectVersion`](#projectVersion) option.

#### name

Type: `string`\
Default: `'config'`

Name of the storage file (without extension).

This is useful if you want multiple storage files for your app. Or if you're making a reusable Electron module that persists some data, in which case you should **not** use the name `config`.

#### cwd

Type: `string`\
Default: [`app.getPath('userData')`](https://electronjs.org/docs/api/app#appgetpathname)

Storage file location. *Don't specify this unless absolutely necessary! By default, it will pick the optimal location by adhering to system conventions. You are very likely to get this wrong and annoy users.*

If a relative path, it's relative to the default cwd. For example, `{cwd: 'unicorn'}` would result in a storage file in `~/Library/Application Support/App Name/unicorn`.

#### encryptionKey

Type: `string | Buffer | TypedArray | DataView`\
Default: `undefined`

This can be used to secure sensitive data **if** the encryption key is stored in a secure manner (not plain-text) in the Node.js app. For example, by using [`node-keytar`](https://github.com/atom/node-keytar) to store the encryption key securely, or asking the encryption key from the user (a password) and then storing it in a variable.

In addition to security, this could be used for obscurity. If a user looks through the config directory and finds the config file, since it's just a JSON file, they may be tempted to modify it. By providing an encryption key, the file will be obfuscated, which should hopefully deter any users from doing so.

It also has the added bonus of ensuring the config file's integrity. If the file is changed in any way, the decryption will not work, in which case the store will just reset back to its default state.

When specified, the store will be encrypted using the [`aes-256-cbc`](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation) encryption algorithm.

#### fileExtension

Type: `string`\
Default: `'json'`

Extension of the config file.

You would usually not need this, but could be useful if you want to interact with a file with a custom file extension that can be associated with your app. These might be simple save/export/preference files that are intended to be shareable or saved outside of the app.

#### clearInvalidConfig

Type: `boolean`\
Default: `true`

The config is cleared if reading the config file causes a `SyntaxError`. This is a good default, as the config file is not intended to be hand-edited, so it usually means the config is corrupt and there's nothing the user can do about it anyway. However, if you let the user edit the config file directly, mistakes might happen and it could be more useful to throw an error when the config is invalid instead of clearing. Disabling this option will make it throw a `SyntaxError` on invalid config instead of clearing.

#### serialize

Type: `Function`\
Default: `value => JSON.stringify(value, null, '\t')`

Function to serialize the config object to a UTF-8 string when writing the config file.

You would usually not need this, but it could be useful if you want to use a format other than JSON.

#### deserialize

Type: `Function`\
Default: `JSON.parse`

Function to deserialize the config object from a UTF-8 string when reading the config file.

You would usually not need this, but it could be useful if you want to use a format other than JSON.

#### accessPropertiesByDotNotation

Type: `boolean`\
Default: `true`

Accessing nested properties by dot notation. For example:

```js
const Store = require('electron-store');

const store = new Store();

store.set({
	foo: {
		bar: {
			foobar: '🦄'
		}
	}
});

console.log(store.get('foo.bar.foobar'));
//=> '🦄'
```

Alternatively, you can set this option to `false` so the whole string would be treated as one key.

```js
const store = new Store({accessPropertiesByDotNotation: false});

store.set({
	`foo.bar.foobar`: '🦄'
});

console.log(store.get('foo.bar.foobar'));
//=> '🦄'
```

#### watch

Type: `boolean`\
Default: `false`

Watch for any changes in the config file and call the callback for `onDidChange` or `onDidAnyChange` if set. This is useful if there are multiple processes changing the same config file, for example, if you want changes done in the main process to be reflected in a renderer process.

### Instance

You can use [dot-notation](https://github.com/sindresorhus/dot-prop) in a `key` to access nested properties.

The instance is [`iterable`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Iteration_protocols) so you can use it directly in a [`for…of`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/for...of) loop.

#### .set(key, value)

Set an item.

The `value` must be JSON serializable. Trying to set the type `undefined`, `function`, or `symbol` will result in a TypeError.

#### .set(object)

Set multiple items at once.

#### .get(key, defaultValue?)

Get an item or `defaultValue` if the item does not exist.

#### .reset(...keys)

Reset items to their default values, as defined by the `defaults` or `schema` option.

#### .has(key)

Check if an item exists.

#### .delete(key)

Delete an item.

#### .clear()

Delete all items.

#### .onDidChange(key, callback)

`callback`: `(newValue, oldValue) => {}`

Watches the given `key`, calling `callback` on any changes.

When a key is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.

Returns a function which you can use to unsubscribe:

```js
const unsubscribe = store.onDidChange(key, callback);

unsubscribe();
```

#### .onDidAnyChange(callback)

`callback`: `(newValue, oldValue) => {}`

Watches the whole config object, calling `callback` on any changes.

`oldValue` and `newValue` will be the config object before and after the change, respectively. You must compare `oldValue` to `newValue` to find out what changed.

Returns a function which you can use to unsubscribe:

```js
const unsubscribe = store.onDidAnyChange(callback);

unsubscribe();
```

#### .size

Get the item count.

#### .store

Get all the data as an object or replace the current data with an object:

```js
const Store = require('electron-store');

const store = new Store();

store.store = {
	hello: 'world'
};
```

#### .path

Get the path to the storage file.

#### .openInEditor()

Open the storage file in the user's editor.

## FAQ

#### [Advantages over `window.localStorage`](https://github.com/sindresorhus/electron-store/issues/17)

#### Can I use YAML or another serialization format?

The `serialize` and `deserialize` options can be used to customize the format of the config file, as long as the representation is compatible with `utf8` encoding.

Example using YAML:

```js
const Store = require('electron-store');
const yaml = require('js-yaml');

const store = new Store({
	fileExtension: 'yaml',
	serialize: yaml.safeDump,
	deserialize: yaml.safeLoad
});
```

#### How do I get store values in the renderer process, when my store was initialized in the main process?

The store is not a singleton, so you will have to pass the values back and forth as messages. Electron provides a handy [`invoke/handle` API](https://www.electronjs.org/docs/api/ipc-main#ipcmainhandlechannel-listener) that works well for accessing these values.

```js
ipcMain.handle('getStoreValue', (event, key) => {
	return store.get(key);
});
```

```js
const foo = await ipcRenderer.invoke('getStoreValue', 'foo');
```

It is recommended to adopt this pattern even if `electron-store` currently works directly in the renderer process as Electron plans to remove the `remote` module in the future. An alternative is to create your own singleton, which is described in [#15](https://github.com/sindresorhus/electron-store/issues/15).

## Related

- [electron-util](https://github.com/sindresorhus/electron-util) - Useful utilities for developing Electron apps and modules
- [electron-debug](https://github.com/sindresorhus/electron-debug) - Adds useful debug features to your Electron app
- [electron-context-menu](https://github.com/sindresorhus/electron-context-menu) - Context menu for your Electron app
- [electron-dl](https://github.com/sindresorhus/electron-dl) - Simplified file downloads for your Electron app
- [electron-unhandled](https://github.com/sindresorhus/electron-unhandled) - Catch unhandled errors and promise rejections in your Electron app
- [electron-reloader](https://github.com/sindresorhus/electron-reloader) - Simple auto-reloading for Electron apps during development
- [electron-serve](https://github.com/sindresorhus/electron-serve) - Static file serving for Electron apps
- [conf](https://github.com/sindresorhus/conf) - Simple config handling for your app or module
- [More…](https://github.com/search?q=user%3Asindresorhus+electron)
