const path = require('path')
const git = require('./index.cjs')
const http = require('./http/web/index.cjs')
const fs = require('fs')

const dir = path.join(process.cwd(), 'isomorphic-git-test')
git.fush({ onAuth: () => ({ username: "billytrend-cohere", password: "" }), fs, http, dir, targetUrl: 'https://github.com/billytrend-cohere/isomorphic-git', sourceUrl: 'https://github.com/turtle-review/isomorphic-git-test' }).then(console.log).catch(console.error)
// git.fetch({ fs, http, dir }).then(console.log).catch(console.error)
// git.push({ onAuth: () => ({ username: "billytrend-cohere", password: "" }), fs, http, dir }).then(console.log).catch(console.error)
