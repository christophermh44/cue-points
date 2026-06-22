import Playlist from './PlaylistComponent.js'
import Transport from './TransportComponent.js'

import { computed } from './vue.js'

export default {
    template: /*html*/`
<header>
    <h1>Cue points</h1>
    <button type="button" title="Shuffle playlist" @click="shuffle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shuffle-icon lucide-shuffle"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/></svg>
    </button>
    <button type="button" title="Settings" commandfor="settings" command="show-modal">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders-vertical-icon lucide-sliders-vertical"><path d="M10 8h4"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M17 16h4"/><path d="M19 12V3"/><path d="M19 21v-5"/><path d="M3 14h4"/><path d="M5 10V3"/><path d="M5 21v-7"/></svg>
    </button>
</header>
<Playlist ref="playlist"></Playlist>
<details>
    <summary>About</summary>
    <p>
        This demo shows how a simple algorithm implemented in a small Web page can compute when a song starts and when it ends, to create fluid mixes between two consecutive songs.
    </p>
    <p>
        It works by detecting when RMS mean level is louder than the threshold at the start of the music. The same algorithm is used for the end, but the music file is examinated starting from the end.
    </p>
    <p>
        For now, this algorithm is still in work, but efficient for a lot of files. It may be improved with a filter to focus on what a normal human ear can hear or using LUFS levels.
    </p>
</details>
<dialog id="settings">
    <header>
        <h2>
            Settings
        </h2>
        <button type="button" title="Close settings" commandfor="settings" command="close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
    </header>
    <div class="content">
        <fieldset>
            <legend>Start detection</legend>
            <p class="field">
                <label for="startthreshold">Threshold (dB)</label>
                <input type="number" id="startthreshold" v-model.number="startThreshold" min="-120" max="0" step="0.1">
            </p>
            <p class="field">
                <label for="startwindowsize">Window size (ms)</label>
                <input type="number" id="startwindowsize" v-model.number="startWindowSize" min="1" max="5000" step="1">
            </p>
        </fieldset>
        <fieldset>
            <legend>End detection</legend>
            <p class="field">
                <label for="endThreshold">Threshold (dB)</label>
                <input type="number" id="endThreshold" v-model.number="endThreshold" min="-120" max="0" step="0.1">
            </p>
            <p class="field">
                <label for="endwindowsize">Window size (ms)</label>
                <input type="number" id="endwindowsize" v-model.number="endWindowSize" min="1" max="5000" step="1">
            </p>
        </fieldset>
    </div>
</dialog>
    `,

    components: { Playlist, Transport },

    data() {
        return {
            startThreshold: -40,
            startWindowSize: 10,
            endThreshold: -30,
            endWindowSize: 1200
        }
    },

    provide() {
        return {
            startThreshold: computed(() => this.startThreshold),
            startWindowSize: computed(() => this.startWindowSize),
            endThreshold: computed(() => this.endThreshold),
            endWindowSize: computed(() => this.endWindowSize)
        }
    },

    methods: {
        shuffle() {
            this.$refs.playlist.shuffle()
        }
    }
}