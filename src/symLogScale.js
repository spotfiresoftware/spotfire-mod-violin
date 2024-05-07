import { ticks } from "d3-array";
import { linearish } from "../node_modules/d3-scale/src/linear.js";
import { copy, transformer } from "../node_modules/d3-scale/src/continuous.js";
import { initRange } from "../node_modules/d3-scale/src/init.js";

// c is the constant for when x = 0;
function transformSymlog(c) {
  return function (x) {
    // This was log1p - not sure why, but Math.log matches the d3 log scale
    // Because it works with small numbers and doesn't give rise to
    // errors
    if (x == 0) {
       // console.log("Returning", Math.log(Math.abs(c)));
       //return 0; //Math.log(Math.abs(c));
    }

    return Math.asinh(x / 0.5);


    let y = x;

    if (Math.abs(x) > 0.1) {
        y = Math.sign(x) * Math.log(Math.abs(x));
    }
    
    console.log("x,y", x, y);

    /*console.log(
      x,
      Math.sign(x) *
        Math.log(Math.abs(x / c), Math.sign(x) * Math.log1p(Math.abs(x / c)))
    );*/
    return y;
    return Math.sign(x) * Math.log(1 + Math.abs(x / c));
  };
}

function transformSymexp(c) {
  return function (x) {
    return Math.sign(x) * Math.expm1(Math.abs(x) - 1) * c;
  };
}

export function symlogish(transform) {
  var c = 1,
    scale = transform(transformSymlog(c), transformSymexp(c));

  scale.constant = function (_) {
    return arguments.length
      ? transform(transformSymlog((c = +_)), transformSymexp(c))
      : c;
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

// Need to check the case where lower is 0.1, and upper is 100000 - looks good

// This is wrong:
// -10000 to 100000 - not keeping negative powers of 10, and min is overlapping

export default function symlog() {
  var scale = symlogish(transformer());

  scale.copy = function () {
    return copy(scale, symlog()).constant(scale.constant());
  };

  let base = 10;
  let logs = logp(base);

  scale.ticks = (count) => {
    //console.log("count", count);
    const d = scale.domain();
    let min = d[0];
    let max = d[d.length - 1];
    const r = max < min;

    //if (r) [min, max] = [max, min];

    // We have an issue here - Math.log10(Math.abs(min) is negative - this is the power
    // - we need to iterate over these
    console.log("Math.log10(Math.abs(min))", Math.log10(Math.abs(min)));

    let i = Math.log10(Math.abs(min));
    let j = Math.log10(Math.abs(max));
    let k;
    let t;
    const n = count == null ? 10 : +count;
    let z = [];

    // Just add the minimum
    z.push(min);

    console.log("n, r, min, max", n, r, min, max);
    console.log("i, j", i, j, j - i, !(base % 1) && j - i < n);

    (i = Math.floor(i)), (j = Math.ceil(j));

    // Negative values
    for (; i <= 0; ++i) {
      for (k = -base; k < 0; ++k) {
        t = k * Math.pow(base, i);
        console.log("i, j, k, t", i, j, k, t, !z.includes(t) && t < min, t < min);
        if (t < min) continue;
        if (t > max) break;
        if (!z.includes(t)) {
          console.log("pushing");
          z.push(t);
        }
      }
    }
    console.log("positive");
    // Positive values
    for (i = 0; i < j; ++i) {
      for (k = 0; k < base; ++k) {
        t = k * Math.pow(base, i);
        console.log("i, j, k, t", i, j, k, t, !z.includes(t) && t < min);
        if (t < min) continue;
        if (t > max) break;
        if (!z.includes(t)) {
            console.log("pushing");
          z.push(t);
        }
      }
    }
    // Check under which conditions this occurs
    if (z.length * 2 < n) {
      console.log("!!!WARNING: using fallback ticks mechanism!!!!");
      //z = ticks(min, max, n);
    }
    z.sort((a, b) => a - b);
    return z;
  };

  //console.log("ticks", scale.ticks(10));

  return initRange.apply(scale, arguments);
}
