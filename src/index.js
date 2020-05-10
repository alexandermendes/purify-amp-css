import { parse } from 'node-html-parser';
import purify from 'purify-css';

const getAmpElement = (doc) => {
  const head = doc.querySelector('head');

  return head.childNodes.find(({ tagName, rawAttrs }) => (
    tagName === 'style' && rawAttrs === 'amp-custom'
  ));
};

const getAmpCss = (html) => {
  const doc = parse(html, { style: true });
  const el = getAmpElement(doc);

  return el ? el.text : '';
};

const setAmpCss = (html, css) => {
  const doc = parse(html, {
    // These node-html-parser options are disabled by default as they each hurt
    // performance slightly, but we don't want to mess with the original doc,
    // so turn them all on
    style: true,
    script: true,
    comments: true,
    pre: true,
  });

  const el = getAmpElement(doc);

  el.set_content(css);

  return doc.toString();
};

const getBody = (html) => {
  const doc = parse(html);
  const body = doc.querySelector('body');

  return body ? body.toString() : '';
};

export default () => (req, res, next) => {
  const { end } = res;

  res.end = (originalData, ...args) => {
    let data = res.data || '';

    if (typeof originalData === 'string') {
      data += originalData;
    }

    if (originalData instanceof Buffer) {
      data += originalData.toString();
    }

    const ampCss = getAmpCss(data);
    const body = getBody(data);

    if (!body || !ampCss) {
      end.call(res, data, ...args);
      return;
    }

    purify(body, ampCss, { minify: true }, (purifiedCss) => {
      data = setAmpCss(data, purifiedCss);

      // eslint-disable-next-line no-underscore-dangle
      if (data !== undefined && !res._header) {
        res.setHeader('content-length', Buffer.byteLength(data, ...args));
      }

      end.call(res, data, ...args);
    });
  };

  if (next) {
    next();
  }
};
