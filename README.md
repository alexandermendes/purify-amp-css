# Purify AMP CSS

AMP pages currently have a [75KB CSS limit](https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/).
This package aims to help you stay within that limit by monkey patching the
[Node HTTP ServerResponse](https://nodejs.org/api/http.html) object, searching
for any inline AMP styles, and replacing with a purified and minified version.

## Installation

```
yarn add purify-amp-css -D
```

## Usage

Here is an example using [Express](https://expressjs.com/):


```js
import express from 'express';
import purifyAmpCss from 'purify-amp-css';

const app = express()

app.use(purifyAmpCss());

// ...
```

As this package does not depend on Express you can also call the function
directly with Node's HTTP Request and Response objects.

Here's another example using [Next.js](https://nextjs.org/):

```js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const purify = purifyAmpCss();

    purify(ctx.req, ctx.res);

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