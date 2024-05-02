import { ticks } from "d3-array";
import {linearish} from "../node_modules/d3-scale/src/linear.js";
import {copy, transformer} from "../node_modules/d3-scale/src/continuous.js";
import {initRange} from "../node_modules/d3-scale/src/init.js";

// c is the constant for when x = 0;
function transformSymlog(c) {
  return function(x) {
    // This was log1p - not sure why, but Math.log matches the d3 log scale
    // Because it works with small numbers and doesn't give rise to
    // errors
    /*if (x == 0) {
        return 0;
    }*/
    console.log(x, Math.sign(x) * Math.log(Math.abs(x / c), Math.sign(x) * Math.log1p(Math.abs(x / c))));
    return Math.sign(x) * Math.log(1 + Math.abs(x / c));
  };
}

function transformSymexp(c) {
  return function(x) {
    return Math.sign(x) * Math.exp(Math.abs(x) - 1) * c;
  };
}

export function symlogish(transform) {
  var c = 1, scale = transform(transformSymlog(c), transformSymexp(c));

  scale.constant = function(_) {
    return arguments.length ? transform(transformSymlog(c = +_), transformSymexp(c)) : c;
  };

 
  return linearish(scale);
}

function logp(base) {
    return base === Math.E
      ? Math.log
      : (base === 10 && Math.log10) ||
          (base === 2 && Math.log2) ||
          ((base = Math.log(base)), (x) => Math.log(x) / base);
  }

function pows(base, x) {
    return Math.pow(base, x);
}

export default function symlog() {
  var scale = symlogish(transformer());

  scale.copy = function() {
    return copy(scale, symlog()).constant(scale.constant());
  };

  let base = 10;
  let logs = logp(base);

  scale.ticks = (count) => {
    //console.log("count", count);
    const d = scale.domain();
    let u = d[0];
    let v = d[d.length - 1];
    const r = v < u;

    if (r) [u, v] = [v, u];

    let i = Math.log10(Math.abs(u));
    let j = Math.log10(Math.abs(v));
    let k;
    let t;
    const n = count == null ? 10 : +count;
    let z = [];
    
    console.log("n, r, u, v", n, r, u, v);
    console.log("i, j", i, j);

    if (!(base % 1) && j - i < n) {
      (i = Math.floor(i)), (j = Math.ceil(j));
      if (u > 0)
        for (; i <= j; ++i) {
          for (k = 1; k < base; ++k) {
            t = i < 0 ? k / pows(base, -i) : k * pows(base, i);
            if (t < u) continue;
            if (t > v) break;
            z.push(t);
          }
        }
      else
        for (; i <= j; ++i) {
          for (k = base - 1; k >= 1; --k) {
            t = i > 0 ? k / pows(base, -i) : k * pows(base, i);
            if (t < u) continue;
            if (t > v) break;
            z.push(t);
          }
        }
      if (z.length * 2 < n) z = ticks(u, v, n);
    } else {
      z = ticks(i, j, Math.min(j - i, n)).map(pows);
    }
    return r ? z.reverse() : z;
  }; 

  //console.log("ticks", scale.ticks(10));

  return initRange.apply(scale, arguments);
}