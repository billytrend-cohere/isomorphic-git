// @ts-check
import '../typedefs.js'

import { _fush } from '../commands/fush.js'
import { FileSystem } from '../models/FileSystem.js'
import { assertParameter } from '../utils/assertParameter.js'
import { join } from '../utils/join.js'

/**
 * @typedef {Object} GitProgressEvent
 * @property {string} phase
 * @property {number} loaded
 * @property {number} total
 */

/**
 * @callback ProgressCallback
 * @param {GitProgressEvent} progress
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {Object} HttpClient
 * @property {function(Object): Promise<Object>} request
 */

/**
 * Synchronize two remote repositories by combining fetch and push logic.
 *
 * @param {object} args
 * @param {import('../typedefs.js').FsClient} args.fs - a file system client
 * @param {HttpClient} args.http - an HTTP client
 * @param {ProgressCallback} [args.onProgress] - optional progress event callback
 * @param {import('../typedefs.js').MessageCallback} [args.onMessage] - optional message event callback
 * @param {import('../typedefs.js').AuthCallback} [args.onAuth] - optional auth fill callback
 * @param {import('../typedefs.js').AuthFailureCallback} [args.onAuthFailure] - optional auth rejected callback
 * @param {import('../typedefs.js').AuthSuccessCallback} [args.onAuthSuccess] - optional auth approved callback
 * @param {string} [args.dir] - The [working tree](dir-vs-gitdir.md) directory path
 * @param {string} [args.gitdir] - The [git directory](dir-vs-gitdir.md) path. Defaults to `join(dir, '.git')`.
 * @param {string} args.sourceUrl - URL of the source remote repository
 * @param {string} args.targetUrl - URL of the target remote repository
 * @param {Object<string, string>} [args.headers] - Additional headers to include in HTTP requests
 * @param {object} [args.cache] - a [cache](cache.md) object
 *
 * @returns {Promise<void>} Resolves successfully when synchronization is complete
 *
 * @example
 * await git.fush({
 *   fs,
 *   http,
 *   dir: '/tutorial',
 *   sourceUrl: 'https://github.com/source/repo',
 *   targetUrl: 'https://github.com/target/repo',
 * })
 */
export async function fush({
    fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    dir,
    gitdir = dir ? join(dir, '.git') : '',
    sourceUrl,
    targetUrl,
    headers = {},
    cache = {},
}) {
    try {
        assertParameter('fs', fs)
        assertParameter('http', http)
        assertParameter('gitdir', gitdir)
        assertParameter('sourceUrl', sourceUrl)
        assertParameter('targetUrl', targetUrl)

        return await _fush({
            fs: new FileSystem(fs),
            cache,
            http,
            onProgress,
            onMessage,
            onAuth,
            onAuthSuccess,
            onAuthFailure,
            gitdir,
            sourceUrl,
            targetUrl,
            headers,
        })
    } catch (err) {
        err.caller = 'git.fush'
        throw err
    }
}