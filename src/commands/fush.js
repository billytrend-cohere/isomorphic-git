import { GitRemoteManager } from '../managers/GitRemoteManager.js';
import { collect } from '../utils/collect.js';
import { filterCapabilities } from '../utils/filterCapabilities.js';
import { pkg } from '../utils/pkg.js';
import { parseReceivePackResponse } from '../wire/parseReceivePackResponse.js';
import { parseUploadPackResponse } from '../wire/parseUploadPackResponse.js';
import { writeReceivePackRequest } from '../wire/writeReceivePackRequest.js';
import { writeUploadPackRequest } from '../wire/writeUploadPackRequest.js';

/**
 * Synchronize two remote repositories by combining fetch and push logic.
 *
 * @param {object} args
 * @param {import('../models/FileSystem.js').FileSystem} args.fs
 * @param {any} args.cache
 * @param {HttpClient} args.http
 * @param {ProgressCallback} [args.onProgress]
 * @param {MessageCallback} [args.onMessage]
 * @param {AuthCallback} [args.onAuth]
 * @param {AuthFailureCallback} [args.onAuthFailure]
 * @param {AuthSuccessCallback} [args.onAuthSuccess]
 * @param {string} args.gitdir
 * @param {string} args.sourceUrl - URL of the source remote repository
 * @param {string} args.targetUrl - URL of the target remote repository
 * @param {Object<string, string>} [args.headers]
 *
 * @returns {Promise<void>} Resolves when synchronization is complete
 */
export async function _fush({
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    sourceUrl,
    targetUrl,
    headers = {},
}) {
    try {
        // Discover refs and capabilities of the source remote
        const sourceRemote = await GitRemoteManager.getRemoteHelperFor({ url: sourceUrl });
        const sourceInfo = await sourceRemote.discover({
            http,
            onAuth,
            onAuthSuccess,
            onAuthFailure,
            service: 'git-upload-pack',
            url: sourceUrl,
            headers,
            protocolVersion: 1,
        });

        // Discover refs and capabilities of the target remote
        const targetRemote = await GitRemoteManager.getRemoteHelperFor({ url: targetUrl });
        const targetInfo = await targetRemote.discover({
            http,
            onAuth,
            onAuthSuccess,
            onAuthFailure,
            service: 'git-receive-pack',
            url: targetUrl,
            headers,
            protocolVersion: 1,
        });

        // Compare refs to determine missing objects
        const sourceRefs = sourceInfo.refs;
        const targetRefs = targetInfo.refs;
        const missingRefs = new Map(
            [["refs/heads/billytrend-cohere-patch-1", sourceInfo.refs.get("refs/heads/billytrend-cohere-patch-1")]]
        );

        const capabilities = filterCapabilities(
            [...sourceInfo.capabilities],
            [
                'multi_ack_detailed',
                'no-done',
                'side-band-64k',
                // Note: I removed 'thin-pack' option since our code doesn't "fatten" packfiles,
                // which is necessary for compatibility with git. It was the cause of mysterious
                // 'fatal: pack has [x] unresolved deltas' errors that plagued us for some time.
                // isomorphic-git is perfectly happy with thin packfiles in .git/objects/pack but
                // canonical git it turns out is NOT.
                'ofs-delta',
                `agent=${pkg.agent}`,
            ]
        )


        // Request missing objects from the source remote
        const packstream = await writeUploadPackRequest({
            capabilities: capabilities,
            wants: [...missingRefs.values()],
            haves: [...targetInfo.refs.values()],
        });

        const packbuffer = Buffer.from(await collect(packstream));

        // get the packfile from the source remote
        const raw = await sourceRemote.connect({
            http,
            onProgress,
            service: 'git-upload-pack',
            url: sourceUrl,
            headers,
            body: [packbuffer],
            auth: onAuth,
        });

        const response = await parseUploadPackResponse(raw.body)
        const packfile = Buffer.from(await collect(response.packfile))
        const packfileSha = packfile.slice(-20).toString('hex')

        const packstream1 = await writeReceivePackRequest({
            capabilities,
            triplets: [{
                oldoid: "0000000000000000000000000000000000000000",
                oid: sourceInfo.refs.get("refs/heads/billytrend-cohere-patch-1"),
                fullRef: "refs/heads/billytrend-cohere-patch-1"
            }],
        })


        console.log('Packfile:', packfile);
        console.log('Packfile SHA:', packfileSha);
        console.log('Response:', response);

        // Send the packfile to the target remote
        const targetResponse = await targetRemote.connect({
            http,
            onProgress,
            service: 'git-receive-pack',
            url: targetUrl,
            headers,
            body: [...packstream1, ...packfile],
            auth: onAuth,
        });

        const targetResult = await parseReceivePackResponse(targetResponse.body);

        console.log('Target Response:', targetResult);

        if (!targetResult.ok) {
            throw new Error('Failed to push packfile to target remote');
        }

    } catch (err) {
        err.caller = 'git.fush';
        throw err;
    }
}