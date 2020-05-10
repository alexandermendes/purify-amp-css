import { parse } from 'node-html-parser';
import purifyCss from 'purify-css';

const getAmpElement = (doc) => {
  const head = doc.querySelector('head');

  if (!head) {
    return null;
  }

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

const report = (original, purified) => {
  const originalBytes = Buffer.byteLength(original, 'utf8');
  const purifiedBytes = Buffer.byteLength(purified, 'utf8');
  const diff = originalBytes - purifiedBytes;
  const percentage = ((diff / originalBytes) * 100).toFixed(2);

  console.log(`Purge AMP CSS removed ${diff} bytes of unused CSS (${percentage}%)`);
};

const getPurifiedData = ({
  minify = true,
  whitelist = [],
  debug = false,
} = {}, originalData, originalFunction, res, ...args) => {
  let data = res.data || '';

  if (typeof originalData === 'string') {
    data += originalData;
  }

  if (originalData instanceof Buffer) {
    data += originalData.toString();
  }

  const ampCss = getAmpCss(data);

  if (!ampCss) {
    originalFunction.call(res, data, ...args);
    if (debug) console.log('Purge AMP CSS found no <style amp-custom> element');
    return;
  }

  const body = getBody(data);

  if (!body) {
    originalFunction.call(res, data, ...args);
    return;
  }

  const purifiedCss = purifyCss(body, ampCss, { minify, whitelist });

  if (debug) {
    report(ampCss, purifiedCss);
  }

  data = setAmpCss(data, purifiedCss);

  // eslint-disable-next-line no-underscore-dangle
  if (data !== undefined && !res._header) {
    res.setHeader('content-length', Buffer.byteLength(data, ...args));
  }

  originalFunction.call(res, data, ...args);
};

/**
 * Amp purifier.
 */
export const purifyAmpCss = (req, res, opts) => {
  const { end, write } = res;

  res.write = (originalData, ...args) => (
    getPurifiedData(opts, originalData, write, res, ...args)
  );

  res.end = (originalData, ...args) => (
    getPurifiedData(opts, originalData, end, res, ...args)
  );
};

/**
 * Express middleware.
 */
export const middleware = (opts) => (req, res, next) => {
  purifyAmpCss(req, res, opts);

  if (next) {
    next();
  }
};

export default middleware;
