# wpm

这是一个基于 importmap 的包管理工具。

## 安装

```bash
npm install -g @growing-web/wpm
```

## 指南

### 配置文件

`web-module.json` 将作为 wpm 的配置文件。

```json
{
  "defaultProvider": "dancf",
  "providers": {},
  "dependencies": {
    "react": "^17.0.2"
  }
}
```

### 安装模块

```bash
wpm install
```

运行命令后，它将会生成 `importmap.json` 文件，它是 [导入映射](https://github.com/WICG/import-maps) 的标准格式，你可以用它管理模块。

```json
{
  "imports": {
    "react": "https://es.dancf.com/npm:react@17.0.2/index.js"
  },
  "scopes": {
    "https://es.dancf.com/": {
      "object-assign": "https://es.dancf.com/npm:object-assign@4.1.1/index.js"
    }
  }
}
```

### 使用本地依赖

```json
{
  "defaultProvider": "dancf",
  "providers": {},
  "dependencies": {
    "$ref": "./package.json#/dependencies"
  }
}
```

`web-module.json` 支持使用 [`$ref`](https://json-schema.org/understanding-json-schema/structuring.html#id18) 语法，它可以引入外部定义的 JSON 内容。

### 合并多个依赖表

```json
{
  "defaultProvider": "dancf",
  "providers": {},
  "dependencies": [{
    "$ref": "./package.json#/dependencies"
  }, {
    "react": "^17.0.2"
  }]
}
```

内部将使用 `Object.assign(...dependencies)` 进行合并，因此右边的优先级高于左边。

### 使用工作空间

```json
{
  "defaultProvider": "dancf",
  "providers": {},
  "dependencies": {
    "test": "workspace:*"
  }
}
```

`workspace:*` 协议可以根据工作空间内的本地包来确定版本号，也就是说 wpm 安装的时候会最终读取工作空间对应的包的版本号来工作。

### 切换 CDN

`defaultProvider` 可以指定默认的模块提供者，你可以在公共 CDN 或者 `nodemodules` 切换，默认值是 `jspm`。

### 本地调试

通常情况下将使用 CDN 而不是 `nodemodules` 来管理模块，如果需要单独调试某个包，可以将其映射到本地来。

将所有模块映射到本地：

```json
{
  "defaultProvider": "nodemodules",
  "providers": {},
  "dependencies": [{
    "$ref": "./package.json#/dependencies"
  }, {
    "react": "^17.0.2"
  }]
}
```

只映射特定的模块：

```json
{
  "defaultProvider": "dancf",
  "providers": {
    "react": "nodemodules"
  },
  "dependencies": [{
    "$ref": "./package.json#/dependencies"
  }, {
    "react": "^17.0.2"
  }]
}
```

## 禁用缓存

```bash
wpm install --force
```