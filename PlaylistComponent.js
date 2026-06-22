import PlaylistItem from './PlaylistItemComponent.js'

function nextUid() {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    return `${timestamp.toString(36)}_${random.toString(36)}`
}

export default {
    template: /*html*/`
<main id="playlist">
    <ul v-if="playlist.length">
        <PlaylistItem
            v-for="({ id, file }, index) in playlist"
            ref="item"
            :key="id"
            :file
            @next="next(index)"
        ></PlaylistItem>
    </ul>
    <p :class="{ 'is-dropping': mayDrop }" @dragover.prevent="dragover" @dragend="dragend" @drop.prevent="drop">
        Drop audio files here!
    </p>
</main>
    `,

    components: { PlaylistItem },

    data() {
        return {
            playlist: [ ],
            mayDrop: false
        }
    },

    methods: {
        dragover() {
            this.mayDrop = true
        },

        dragend() {
            this.mayDrop = false
        },

        drop(event) {
            this.mayDrop = false
            for (const file of event.dataTransfer?.files ?? [ ]) {
                this.playlist.push({ id: nextUid(), file })
            }
        },
        
        next(index) {
            this.$refs.item[(index + 1) % this.playlist.length]?.play()
        },

        shuffle() {
            console.log(this.playlist)
            this.playlist = this.playlist.toSorted(() => 0.5 - Math.random())
        }
    }
}