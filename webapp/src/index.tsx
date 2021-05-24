import {Action, Store} from 'redux';

import {GlobalState} from 'mattermost-redux/types/store';
import {Post} from 'mattermost-redux/types/posts';

import manifest from './manifest';

// eslint-disable-next-line import/no-unresolved
import {PluginRegistry} from './types/mattermost-webapp';

const mmKVStoreDBName = 'localforage';
const mmKVStorageName = 'keyvaluepairs';

let getPost: (postID: string) => Post;

let db;

const initDB = () => {
    const request = indexedDB.open(mmKVStoreDBName);
    request.onerror = (event) => {
        console.error('Failed to open KV store from IndexedDB.');
        console.error(event);
    };
    request.onsuccess = (event) => {
        db = event.target.result;
    };
};

function getPostDraft(postID: string): object {
    return new Promise((resolve) => {
        db.transaction(mmKVStorageName).
            objectStore(mmKVStorageName).
            get(`reduxPersist:storage:comment_draft_${postID}`).
            onsuccess = (event) => (event.target.result ? resolve(JSON.parse(event.target.result)) : resolve(null));
    });
}

export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        initGetPost(store);
        initDB();

        // @ts-ignore
        registry.registerPostDropdownMenuAction('Quote Reply', (postID) => postMenuClickHandler(postID, store), postMenuFilter);
    }
}

function initGetPost(store: Store<GlobalState, Action<Record<string, unknown>>>) {
    getPost = (postID: string) => store.getState().entities.posts.posts[postID];
}

const postMenuClickHandler = async (postID: string, store: Store<GlobalState, Action<Record<string, unknown>>>) => {
    const post = getPost(postID) || {};

    const postDraft = await getPostDraft(post.root_id || post.id);
    console.log(postDraft);
    let message = `> ${post.message}\n\n`;

    if (postDraft) {
        message += postDraft.value.message;
    }

    store.dispatch({
        type: 'SET_GLOBAL_ITEM',
        data: {
            name: `comment_draft_${post.root_id || post.id}`,
            value: {
                message,
                fileInfos: [],
                uploadsInProgress: [],
            },
            timestamp: new Date(),
        },
    });

    store.dispatch({
        type: 'SELECT_POST',
        postId: post.root_id || post.id,
        channelId: post.channel_id,
        timestamp: Date.now(),
    });
};

const postMenuFilter = (postID: string) => {
    const post = getPost(postID);
    return post && (post.type === '' || post.type === 'slack_attachment');
};

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void
    }
}

window.registerPlugin(manifest.id, new Plugin());
