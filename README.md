# Purify AMP CSS

[![npm version](https://badge.fury.io/js/purify-amp-css.svg)](https://badge.fury.io/js/purify-amp-css)

AMP pages currently have a [75KB CSS limit](https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/).

This package aims to help you stay within that limit by monkey patching the
[Node HTTP ServerResponse](https://nodejs.org/api/http.html) so that when markup
is returned from the server the contents of the `<style amp-custom>` element
can be run through [PurifyCSS](https://github.com/purifycss/purifycss), removing any unused styles
and replacing with a purified and minified version.

As AMP pages are served from the AMP cache any performance hit taken when
initially rendering the page shouldn't matter in production.

## Installation

```
yarn add purify-amp-css -D
```

## Usage

Here's an example using Node's HTTP server:

```js
import http from 'http';
import { purifyAmpCss } from 'purify-amp-css';
import myAmpMarkup from './some/markup';

http.createServer((req, res) => {
  const opts = { info: true };

  purifyAmpCss(req, res, opts);

  res.end(myAmpMarkup);
}).listen(8080);
```

Here's an example using [Next.js](https://nextjs.org/):

```js
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { purifyAmpCss } from 'purify-amp-css';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const opts = { info: true };

    purifyAmpCss(ctx.req, ctx.res, opts);

    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument;
```

Here's an example using [Express](https://expressjs.com/):

```js
import express from 'express';
import purifyAmpCss from 'purify-amp-css';

const app = express()
const opts = { info: true };

app.use(purifyAmpCss.middleware(opts));
```

## Configuration

The options object shown in the examples above accepts the following:

| Option      | Description                            | Default |
|-------------|----------------------------------------|---------|
| `minify`    | Minify the AMP CSS                     | `true`  |
| `whitelist` | Array of selectors to always leave in  | `[]`    |
| `debug`     | Log the amount of CSS that was removed | `false` |
