// ref: https://github.com/nats-io/nats.js/blob/2c1006cdf0973d6a8488227bc66068f05f48854e/examples/nats-req.js
// how to use
// node tools/nats-req.js -s [SERVER_URL]  [EVENT_PATTTERN] [JSON]

// ie.
// node tools/nats-req.js -s 'nats://nats.dev.qmit.pro:4222'  event.pattern '{"key": value }'

const parse = require("minimist");
const { connect, StringCodec, JSONCodec, headers, credsAuthenticator } = require('nats');
const process = require('process');
const fs = require("fs");
const util = require("util");
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const argv = parse(
  process.argv.slice(2),
  {
    alias: {
      "s": ["server"],
      "c": ["count"],
      "i": ["interval"],
      "t": ["timeout"],
      "f": ["creds"],
    },
    default: {
      s: "127.0.0.1:4222",
      c: 1,
      i: 0,
      t: 1000,
    },
    boolean: true,
    string: ["server", "count", "interval", "headers", "creds"],
  },
);

const opts = { servers: argv.s };
const subject = String(argv._[0]);
console.log('subject:', subject);
const payload = JSON.parse(argv._[1]) || {};
console.log('payload:', payload);
const count = (argv.c == -1 ? Number.MAX_SAFE_INTEGER : argv.c) || 1;
const interval = argv.i;

if (argv.debug) {
  opts.debug = true;
}

if (argv.creds) {
  const data = fs.readFileSync(argv.creds);
  opts.authenticator = credsAuthenticator(data);
}

if (argv.h || argv.help || !subject) {
  console.log(
    "Usage: node tools/nats-req.js [-s server] [--creds=/path/file.creds] [-c <count>=1] [-t <timeout>=1000] [-i <interval>=0] [--headers='k=v;k2=v2' subject [msg]",
  );
  console.log("to request forever, specify -c=-1 or --count=-1");
  process.exit(1);
}

const sc = JSONCodec();

(async () => {
  let nc;
  try {
    nc = await connect(opts);
  } catch (err) {
    console.log(`error connecting to nats: ${err.message}`);
    return;
  }
  console.info(`connected ${nc.getServer()}`);
  nc.closed()
    .then((err) => {
      if (err) {
        console.error(`closed with an error: ${err.message}`);
      }
    });

  const hdrs = argv.headers ? headers() : undefined;
  if (hdrs) {
    argv.headers.split(";").map((l) => {
      const [k, v] = l.split("=");
      hdrs.append(k, v);
    });
  }

  for (let i = 1; i <= count; i++) {
    await nc.request(
      subject,
      sc.encode({
        data: payload,
        id: `test-client-${process.pid}`,
      }),
      { timeout: argv.t, headers: hdrs },
    )
      .then((m) => {
        console.log(`[${i}]: ${util.inspect(sc.decode(m.data), {showHidden: false, depth: null, colors: true})}`);

        if (argv.headers && m.headers) {
          const h = [];
          for (const [key, value] of m.headers) {
            h.push(`${key}=${value}`);
          }
          console.log(`\t${h.join(";")}`);
        }
      })
      .catch((err) => {
        console.log(`[${i}]: request failed: ${err.message}`);
      });
    if (interval) {
      await delay(interval);
    }
  }
  await nc.flush();
  await nc.close();
})();
