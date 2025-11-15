import { invoke } from '@tauri-apps/api/core';
import { app } from '@tauri-apps/api'
import { arch, platform } from '@tauri-apps/plugin-os'

function getWeight(tag) {
    return tag.split('.').map((x, i) => +x * (100 ** (3 - i))).reduce((x,y) => x + y, 0)
}

function getAssets(version) {
    return version.assets
          .filter(ass => ass.state === 'uploaded')
          .map(ass => ({
              name: ass.name,
              uploader: ass.uploader.login,
              url: ass.browser_download_url,
              digest: ass.digest,
              download_count: ass.download_count,
              updated_at: ass.updated_at
           })
    )
}

const PLATFORM = {
    windows: 'win',
    macos: 'mac',
    ios: 'ios',
    linux: 'linux',
    android: 'android'
}

async function checkUpdates() {
    let data = [];
    try {//TODO enable back
        const versions = []//await invoke("fetch_releases")
        
        data = versions.map(ver => ({ 
            weight: getWeight(ver.tag_name.slice(1)),
            assets: getAssets(ver)
        }))
    } catch (e) {
        console.error(e)
        /*const res = await fetch(gitlab, { method: "GET" });
        data = await res.json();
        data = data[0];*/
        // TODO GitLab
    }
    
    const currentWeight = getWeight(await app.getVersion())
    const system_version = PLATFORM[platform()] + '-' + arch();
    
    const update = data.find(x => x.weight > currentWeight)
    //console.log(update, currentWeight, system_version, data)
    if (update) {
        let found_asset;
        
        for (const asset of update.assets) {
            const version = asset.name.slice(0, asset.name.indexOf('_'));
            if (version === system_version) {
                found_asset = asset;
                break;
            }
        }
        
        if (file) {
            return { update: true, asset: found_asset }
        }
        else {
            return { update: false, meta: "another_platform" }
        }
    }
    return { update: false };
}

export {
    checkUpdates
}
