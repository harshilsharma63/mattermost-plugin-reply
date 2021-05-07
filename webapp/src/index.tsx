import {Action, Store} from 'redux';

import {GlobalState} from 'mattermost-redux/types/store';
import {Post} from 'mattermost-redux/types/posts';

import manifest from './manifest';

// eslint-disable-next-line import/no-unresolved
import {PluginRegistry} from './types/mattermost-webapp';

let getPost: (postID: string) => Post;

export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        initGetPost(store);

        // @ts-ignore
        registry.registerPostDropdownMenuAction('Quote Reply', (postID) => postMenuClickHandler(postID, store), postMenuFilter);
    }
}

function initGetPost(store: Store<GlobalState, Action<Record<string, unknown>>>) {
    getPost = (postID: string) => store.getState().entities.posts.posts[postID];
}

const postMenuClickHandler = (postID: string, store: Store<GlobalState, Action<Record<string, unknown>>>) => {
    const post = getPost(postID) || {};

    store.dispatch({
        type: 'SET_GLOBAL_ITEM',
        data: {
            name: `comment_draft_${post.root_id || post.id}`,
            value: {
                message: `> ${post.message}\n\n`,
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
