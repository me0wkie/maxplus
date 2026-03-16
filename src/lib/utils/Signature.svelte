<script>
    import { onDestroy, onMount } from 'svelte';
    import { currentPresence, currentSessionContacts, currentUser } from '$lib/stores/api';

    import Timestamp from '$lib/utils/Timestamp.svelte';

    export let contact;
    export let chat;

    if (!contact && Object.keys(chat.participants).length === 2) contact = $currentSessionContacts[ Object.keys(chat.participants).find(x => +x !== $currentUser)]

</script>

{ #if contact }
    { #if $currentPresence[contact.id]?.seen !== undefined }
        {contact.gender === 2 ? "Была" : "Был"}
        <Timestamp gender={contact.gender || 1} unixTime={$currentPresence[contact.id]?.seen} />
    { /if }
{ /if }
