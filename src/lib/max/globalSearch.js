import API from '$lib/stores/api'

export async function search(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        isSearching = true;
        try {
            const response = await API.search(query);

            const searchResults = response.map((item, index) => {
            console.log(item)
            
            if(item.contact) return {
                id: Math.random() + "",
                contact: true,
                cid: item.contact.contact.id,
                name: item.contact.contact?.names?.[0]?.name || 'Без имени',
                avatar: item.contact.contact.baseUrl,
                lastSeen: item.contact.presence.seen,
                highlights: item.highlights
            }
            else if(item.chat) {
                return {
                    id: Math.random() + "",
                    cid: item.chat.id,
                    name: item.chat.title,
                    avatar: item.chat.baseIconUrl,
                    lastSeen: item.chat.lastEventTime,
                    highlights: item.highlights
                }
            }
            });
            console.log(searchResults)
            setSearchResults(searchResults);

        } catch (err) {
            console.error("Ошибка поиска:", err);
            searchResults = [];
        } finally {
            isSearching = false;
        }
    }, 300);
}

export async function handleSearchResultClick(setSearchQuery, setSearchResults, result) {
    if(result.contact) {
        const info = await API.contactInfo([ result.cid ])
        console.log(info)
    } else {
        //openChat({ id: result.cid, name: result.name, avatar: result.avatar });
    }
    searchQuery = '';
    searchResults = [];
}
