---
title: "Use ESbuild with 11ty"
description: "A guide on how to configure ESbuild with 11ty."
date: 2023-04-10
layout: post
meta_type: article
tags: posts
keywords: 11ty, eleventy, esbuild, javascript, css, bundler, minifier, static website, static site generator, bundler
canonical: https://aurmartin.fr/posts/11ty-esbuild/
---

<div class="alert alert-info">
  Info: With the release of 11ty v3.0, you can directly use the included <a href="https://www.11ty.dev/docs/plugins/bundle/">plain text bundler</a>.
</div>

## Introduction

[11ty](https://www.11ty.dev/) is a great solution for generating static websites but fall short when it comes to handling your CSS and JavaScript assets. 11ty does not come with any bundler to ensure minimal build time<sup>[1][1]</sup>. The docs<sup>[2][2]</sup> recommend simple solutions to copy your files from your sources to your static website. But there is no way to bundle or minify them.

[ESbuild](https://esbuild.github.io/) is actually a simple and fast builder that works pretty well with the 11ty goal to reduce build time to its minimum.

In this guide I will show you how to configure ESbuild with your 11ty project.

## Setup

Adding ESbuild is actually pretty simple: you need to install ESbuild then add the correct scripts to your package.json.

You can install ESbuild and npm-run-all using npm:
```bash
npm install --save-dev esbuild npm-run-all
```

npm-run-all is a tool that allows you to run multiple npm scripts in parallel.

Then add those scripts to your package.json:
```json
"scripts": {
  "dev:11ty": "npx @11ty/eleventy --serve",
  "dev:css": "esbuild src/assets/css/main.css --bundle --outfile=_site/assets/css/main.css --watch --sourcemap",
  "dev:js": "esbuild src/assets/js/main.js --bundle --outfile=_site/assets/js/main.js --watch --sourcemap",
  "build:11ty": "eleventy",
  "build:css": "esbuild src/assets/main.css --bundle --outfile=_site/assets/css/main.css --minify",
  "build:js": "esbuild src/assets/js/main.js --bundle --outfile=_site/assets/js/main.js --minify",
  "dev": "npm-run-all -p dev:*",
  "build": "npm-run-all build:*"
},
```

- `dev:11ty` starts 11ty live server, watching for changes to your content.
- `dev:css` launch ESbuild on your CSS files in `--watch` mode so it rebuild your stylesheets when needed.
- `dev:js` does the same thing for your JavaScript files.
- `build:11ty` build your 11ty website for production.
- `build:css` build your CSS files for production.
- `build:js` build your JavaScript files for production.

You will only need to use `dev` and `build` scripts. `dev` will start the 11ty live server and watch for changes to your CSS and JavaScript files. `build` will build your 11ty website for production.

## Conclusion

That's it! You can now use ESbuild with 11ty to build your static website.

## References

\[1\]: [The Need for Speed: Why Eleventy Leaves Bundlers Behind][1] </br>
\[2\]: [11ty Docs: Adding CSS, JavaScript, fonts][2]

[1]: https://thenewstack.io/the-need-for-speed-why-eleventy-leaves-bundlers-behind/
[2]: https://www.11ty.dev/docs/assets/
