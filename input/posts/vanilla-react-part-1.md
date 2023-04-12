---
title: "Vanilla React Part 1: Server-side rendering"
description: "In this article, we will see how to create a basic React application with server-side rendering."
date: 2023-02-13
layout: post
tags: posts
keywords: react, javascript, server-side rendering, ssr
---

## Vanllia React

Welcome to the Vanilla React blog series! In this series, we will see how to create a basic React application using only the React library, without any third party library. We will start with server-side rendering and then add routing, data fetching, and more.

You may be used to the React ecosystem but if you want to understand how a React application works under the hood, you should try to implement some of its features from scratch. This will help you understand how React works and how to use it in the best way. Moreover, this vanilla approach is sufficient in many cases and will keep your application as simple as possible.

One of the weird choices I've made is not to use JSX. At least I'm not using it in the first articles. I'll maybe add it later on depending on how it goes. I think it's important to understand how React works without JSX.

I'm really excited to share this series with you! I hope you will enjoy it and learn something new.

## Introduction

Server-side rendering (SSR) is a technique that allows web pages to be rendered on the server and sent to the client as fully-formed HTML documents. While client-side rendering (CSR) has many benefits, including faster navigation and a more dynamic user experience, it also has some drawbacks, such as slower initial page load times and poorer SEO performance.

In this article, we will see how to create a basic React application with server-side rendering.

### Server-side rendering process

The basic process of SSR in React is as follows:

1. The server receives a request from the client for a specific URL.
2. The React application is rendered on the server using [ReactDOMServer](https://reactjs.org/docs/react-dom-server.html) object.
3. The server sends the generated HTML back to the client as the initial response.
4. The client receives the HTML, hydrates the React application using [ReactDOMClient](https://reactjs.org/docs/react-dom-client.html) by attaching event listeners and re-rendering it if necessary.

## Setting up the environment

We will create a basic React application rendered on a [Node.js](https://nodejs.org/) server. To keep things focused on the concept of server-side rendering, we'll create everything from scratch and use as few external dependencies as possible.

You'll just need to have a working Node.js installation, you can find more informations on the [Node.js website](https://nodejs.org/).

## Initial application

We will create a really simple http server to begin with. You can create a new javascript project:

```bash
mkdir ssr-from-scratch
cd ssr-from-scratch
npm init
npm install --save koa koa-static
```

This will initialize npm, and install [koa](https://github.com/koajs/koa) web framework.

Our `server.js` will be this one:

```javascript
import fs from "fs/promises";
import Koa from "koa";
import serve from "koa-static";

const port = 8080;

const app = new Koa();

app.use(serve("static"));

app.use(async (ctx) => {
  if (ctx.path !== "/") {
    return;
  }

  ctx.body = await fs.readFile("index.html", "utf-8");
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
```

Nothing too fancy here:

- We serve static files from the `static` directory,
- Otherwise, we send our `index.html`.

Let's create our `index.html`:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="root"></div>

  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@16.14.0",
        "react-dom": "https://esm.sh/react-dom@16.14.0"
      }
    }
  </script>

  <script src="client.js" type="module"></script>
</body>
</html>
```

We use the [importmap](https://github.com/WICG/import-maps) feature to load React and ReactDOM. This allow us to use the same import statement whether the `client.js` is executed in Node.js or in the browser, we'll come back to that later.

You can create your `static/client.js` like this:

```javascript
import React from "react";
import ReactDOM from "react-dom";

function App() {
  console.log("Rendering App");
  return React.createElement("div", null, "Hello world!");
}

ReactDOM.render(App(), document.getElementById("root"));

export default App;
```

Because we don't have a bundler, we can't use the JSX syntax. But we won't create a lot of components so its okay.

Our import statements here are resolved using the importmap we defined earlier.

Now, you can start the server using node:

```bash
node server.js
```

Once the server is up and running, open [http://localhost:8080/](http://localhost:8080/) in your browser, you should see our React application rendered. If you look at your network tab you should see that the `#root` is empty, which means that the application is currently only being rendered on the client side.

## Enabling server-side rendering

To use server-side rendering we need to call `ReactDOMServer.renderToString` on the server before sending the response.

We need to install React and ReactDOM on server-side:

```bash
npm install --save react react-dom
```

Now we can try to use `ReactDOMServer.renderToString`. If you start a new node interactive terminal, you can play a bit with this function.
For example:

```javascript
> const React = require("react");
undefined
> const ReactDOMServer = require("react-dom/server");
undefined
> const element = React.createElement("div", null, "Hello world!");
undefined
> ReactDOMServer.renderToString(element)
'<div>Hello world!</div>'
```

As you can see, this function render a React element and return the HTML string.

To render the HTML document containing our frontend application rendered inside, we need to:

1. Use `ReactDOMServer.renderToString` to render our application,
2. Insert this HTML inside our `index.html` file.

We can do this in our `server.js`:

```javascript
import fs from "fs/promises";
import Koa from "koa";
import serve from "koa-static";
import ReactDOMServer from "react-dom/server";
import App from "./static/client.js";

const port = 8080;

const app = new Koa();

app.use(serve("static"));

app.use(async (ctx) => {
  const serverSideRender = ReactDOMServer.renderToString(App());

  const indexHtml = await fs.readFile("index.html", "utf-8");

  ctx.body = indexHtml.replace(
    `<div id="root"></div>`,
    `<div id="root">${serverSideRender}</div>`
  );
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
```

If you start your server, you should see this error:
```
ReferenceError: document is not defined
```

What does this mean? This error is thrown because we are trying to use `document` in a Node.js environment. `document` is a global variable available in the browser, but not in Node.js. 

When importing our client:
```javascript
import App from "./static/client.js";
```

We are actually executing the `client.js` file in Node.js. This is the first caveat encountered with server-side rendering. We need to be able to execute the same code in Node.js and in the browser. To do this, can use the magic `if (typeof window !== "undefined")`:

```javascript
import React from "react";
import ReactDOM from "react-dom";

function App() {
  console.log("Rendering App");
  return React.createElement("div", null, "Hello world!");
}

if (typeof window !== "undefined") {
  ReactDOM.render(App(), document.getElementById("root"));
}

export default App;
```

Now, if you start your server, you should see the application rendered on the server side. The "Rendering App" log should appear in your server terminal and in your browser console. In your network tab, you should see that the `#root` element is not empty anymore.

The last remaining issue here is that our app is rendered twice: on the server and on the client. To avoid this, we can use the React `hydrate` function instead of `render`:

```javascript
ReactDOM.hydrate(App(), document.getElementById("root"));
```

And voilà! Server-side rendering is as simple as that!
