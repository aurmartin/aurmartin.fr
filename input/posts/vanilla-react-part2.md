---
title: "Vanilla React Part 2: Routing"
description: "In this article, we will see how to create a basic React application with routing."
date: 2023-03-08
layout: post
tags: posts
keywords: react, javascript, frontend, routing, react-router
---

## Introduction

Welcome to the second part of this series. In the first part, we have seen how to setup a basic React application rendered on the server. In this part, we will see how to setup routing in our application. Our routing system will support:
- server-side routing
- dynamic routes (with parameters)
- navigation between pages

Here, we won't use react-router, but we will implement our own routing system. We will demonstrate that it is not that hard to implement a basic routing system in React and that you don't need to depend on a third party library.

Most third party libraries are great, but they can also be a source of complexity and add an overhead to your bundle. If you don't need a complex routing system, you can save yourself some time and effort by implementing your own.

## Frontend routing

Routing is the process of determining how an application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on). For static websites, routing is usually handled by the web server, but for single-page applications, routing is typically handled by the client-side JavaScript.

Our frontend application should render different components depending on the current URL. For example, if the user is on the `/` path, we should render the `Home` component, if the user is on the `/posts` path, we should render the `Posts` component, and so on.

Our client side source from [Part 1](../vanilla-react-part-1) actually look like this:

```javascript
import React from "react";
import ReactDOM from "react-dom";

const e = React.createElement;

function App() {
  return e("div", null, "Hello world!");
}

if (typeof window !== "undefined") {
  ReactDOM.hydrate(App(), document.getElementById("root"));
}

export default App;
```

We can handle routing using the `window.location.pathname` property which contains the current path on our browser:

```javascript
function App() {
  switch (window.location.pathname) {
    case "/":
      return e("div", null, "Home");

    case "/posts":
      return e("div", null, "Posts");
  }
}
```

If you try to use this code, you will see that the application is not working anymore. This is because the `window` object is not available on the server side:

```text
ReferenceError: window is not defined
```

## Server-side routing

Our ReferenceError come from this line in our `server.js`:

```javascript
const serverSideRender = ReactDOMServer.renderToString(App());
```

We are calling the `App` function to render our application on the server side. But this function is using the `window.location.pathname` property, which is not available on the server side.

To fix this, we can pass the current path, from the `ctx.request` object provided by `koa` to the `App` function:

```javascript
const props = {
  location: ctx.request.url,
};

const serverSideRender = ReactDOMServer.renderToString(App(props));
```

Same thing on the client side:

```javascript
if (typeof window !== "undefined") {
  const props = {
    location: window.location.pathname,
  };
  ReactDOM.hydrate(App(props), document.getElementById("root"));
}
```

And then, we can use this path in our `App` function:

```javascript
function App(props) {
  switch (props.location) {
    case "/":
      return e("div", null, "Home");

    case "/posts":
      return e("div", null, "Posts");
  }
}
```

Great! Now, our application is working again. You can try to go to the `/posts` path and see that the `Posts` message is rendered.

## Components organization

We can split our `App` into smaller components:

```javascript
function Home() {
  return e("div", null, "Home");
}

function Posts() {
  return e("div", null, "Posts");
}

function Router(props) {
  switch (props.location) {
    case "/":
      return e(Home);

    case "/posts":
      return e(Posts);
  }
}

function App(props) {
  return e(Router, props);
}
```

## Navigation

How can we handle dynamic navigation? For example, if we want to navigate from the `Home` component to the `Posts` component, how can we do that?

First, we need to add a link to the `Home` component:

```javascript
function Home() {
  return e(
    "div",
    null,
    e("p", null, "Home page"),
    e("a", { href: "/posts" }, "Go to posts")
  );
}
```

If you try to click on the link, you will see that the page is reloaded. This is because the link is a regular HTML link, and the browser is reloading the page when we click on it. We need to prevent the default behavior of the link and change the `location` used by our `App` component.

For now, the `location` is coming from the `window.location.pathname` property our from our server. We need to store this location in a state variable, and update it when the user click on a link:

```javascript
function Router(props) {
  const [location, setLocation] = React.useState(props.location);

  switch (location) {
    case "/":
      return e(Home, { setLocation });

    case "/posts":
      return e(Posts, { setLocation });
  }
}
```

And use this `setLocation` function in our `Home` component:

```javascript
function Home(props) {
  return e(
    "div",
    null,
    e("p", null, "Home page"),
    e(
      "a",
      {
        href: "/posts",
        onClick: (e) => {
          props.setLocation("/posts");
        },
      },
      "Go to posts"
    )
  );
}
```

Now if you click on the link, the page is not reloaded anymore, and the `Posts` component is rendered.

However, if you try to reload the page, you will see that the `Home` component is rendered again. This is because the `location` is not stored in the browser URL. We need to use the browser `window.history.pushState` function to update the URL. We define a `navigate` function that will update the `location` state variable and push a new state in the browser history:

```javascript
function Router(props) {
  const [location, setLocation] = React.useState(props.location);

  const navigate = (path) => {
    setLocation(path);
    window.history.pushState({}, "", path);
  };

  switch (location) {
    case "/":
      return e(Home, { navigate });

    case "/posts":
      return e(Posts, { navigate });
  }
}
```

And use that function in our `Home` component:

```javascript
function Home(props) {
  return e(
    "div",
    null,
    e("p", null, "Home page"),
    e(
      "a",
      {
        href: "/posts",
        onClick: (e) => {
          e.preventDefault();
          props.navigate("/posts");
        },
      },
      "Go to posts"
    )
  );
}
```

Great, we almost have a working navigation. But if you try to click on the browser back button, you will see that the page is not updated.

The browser expose a `popstate` event that is triggered when the user click on the back or forward button. We can use this event to update the `location` state variable:

```javascript
function Router(props) {
  const [location, setLocation] = React.useState(props.location);

  const navigate = (path) => {
    setLocation(path);
    window.history.pushState({}, "", path);
  };

  React.useEffect(() => {
    const onPopState = () => {
      setLocation(window.location.pathname);
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  switch (location) {
    case "/":
      return e(Home, { navigate });

    case "/posts":
      return e(Posts, { navigate });
  }
}
```

Here, we are using the `useEffect` hook to avoid adding the event listener on every render. We are also using the `useEffect` return function to remove the event listener when the component is unmounted. You can read more about the `useEffect` hook [here](https://reactjs.org/docs/hooks-effect.html).

Now, if you click on the back button, the page is updated.

We have a fully working router and navigation. You can try to add more routes and see that everything is working as expected.

## Route parameters

How can we handle dynamic routes? For example, if we want to display a post based on its ID, how can we do that?

We can use simple regex to extract those parameters from URLs. For example, if we want to extract the post ID from the URL `/posts/123`, we can use the following regex:

```javascript
const match = "/posts/123".match(/\/posts\/(\d+)/);
const postId = match && match[1];
```

Each route, will define a `match` function that will return the route parameters if the URL matches the route:

```javascript
const routes = [
  {
    path: "/",
    match: (path) => path === "/",
    component: Home,
  },
  {
    path: "/posts",
    match: (path) => path === "/posts",
    component: Posts,
  },
  {
    path: "/posts/:id",
    match: (path) => {
      const match = path.match(/\/posts\/(\d+)/);
      return match && { id: match[1] };
    },
    component: ShowPost,
  },
];
```

In our router, we now need to loop over the routes to find the matching route:

```javascript
function Router(props) {
  // ..
  for (const route of routes) {
    const params = route.match(location);
    if (params) {
      const Component = route.component;
      return e(Component, { navigate, params });
    }
  }

  return e("div", null, "Not found");
}
```

Your `ShowPost` component can now use the `id` parameter:

```javascript
function ShowPost(props) {
  return e("div", null, `Post ${props.params.id}`);
}
```

Great, we have a fully working router with dynamic routes.

All of that, with less than 100 lines of code!

## Conclusion

In this article, we have seen how to build a simple router and navigation system with React. Our router is not as powerful as the one provided by React Router, but can be sufficient in many cases. You can freely extend it to add more features.
