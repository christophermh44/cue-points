/**
 * Retourne une fonction qui, tant qu'elle continue à être invoquée,
 * ne sera pas exécutée. La fonction ne sera exécutée que lorsque
 * l'on cessera de l'appeler pendant plus de N millisecondes.
 * Si le paramètre `immediate` vaut vrai, alors la fonction 
 * sera exécutée au premier appel au lieu du dernier.
 * Paramètres :
 *  - func : la fonction à `debouncer`
 *  - wait : le nombre de millisecondes (N) à attendre avant 
 *           d'appeler func()
 *  - immediate (optionnel) : Appeler func() à la première invocation
 *                            au lieu de la dernière (Faux par défaut)
 *  - context (optionnel) : le contexte dans lequel appeler func()
 *                          (this par défaut)
 */
function debounce(func, wait, immediate, context) {
    var result;
    var timeout = null;
    return function() {
        var ctx = context || this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) result = func.apply(ctx, args);
        };
        var callNow = immediate && !timeout;
        // Tant que la fonction est appelée, on reset le timeout.
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) result = func.apply(ctx, args);
        return result;
    };
}

export default {
    props: [ 'file' ],

    inject: [ 'startThreshold', 'startWindowSize', 'endThreshold', 'endWindowSize' ],

    template: /*html*/`
<li class="playlist-item">
    <template v-if="playing">
        <button type="button" title="Pause this file" class="playlist-item__button" @click="pause">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause-icon lucide-pause"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>
        </button>
        <button type="button" title="Jump before the end" class="playlist-item__button" @click="jumpToEnd">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fast-forward-icon lucide-fast-forward"><path d="M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z"/><path d="M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z"/></svg>
        </button>
    </template>
    <button v-else type="button" title="Play this file" class="playlist-item__button" @click="play">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>
    </button>
    <div class="playlist-item__tags">
        <template v-if="metadata.tags">
            <strong class="playlist-item__title" v-text="metadata.tags.title"></strong>
            <span class="playlist-item__artist" v-text="metadata.tags.artist"></span>
        </template>
        <template v-else>
            <span class="playlist-item__filename" v-text="file.filename"></span>
        </template>
    </div>
    <div class="playlist-item__times">
        <div class="playlist-item__mix-point">
            <svg width="16" height="16" version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m3.1637 20h5l8-16h5m-18 0h5l8 16h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" style="paint-order:markers stroke fill"/></svg>
            <span v-text="hrMixPoint"></span>
        </div>
        <div class="playlist-item__duration">
            <span v-text="currentTime"></span> / <span v-text="hrDuration"></span>
        </div>
    </div>
</li>
    `,

    data() {
        return {
            audio: null,
            url: null,
            metadata: { },
            currentTime: '--:--.-',
            hrDuration: '--:--.-',
            duration: null,
            hrMixPoint: '---.-',
            startPoint: null,
            mixPoint: null,
            playing: false,
            rafInstance: null,
            nextTriggered: false,

            recomputeMixPoint: debounce(() => this.doRecomputeMixPoint(), 200, false, this)
        }
    },

    watch: {
        item() {
            this.load()
        },

        startThreshold() {
            this.recomputeMixPoint()
        },

        startWindowSize() {
            this.recomputeMixPoint()
        },

        endThreshold() {
            this.recomputeMixPoint()
        },

        endWindowSize() {
            this.recomputeMixPoint()
        }
    },

    methods: {
        async load() {
            this.url = URL.createObjectURL(this.file)
            const [
                loadedmetadataPromise,
                jsmediatagsPromise,
            ] = await Promise.allSettled([
                this.loadedmetadataHandler(),
                this.jsmediatagsHandler(),
            ])
            this.loadedmetadataLoad(loadedmetadataPromise)
            this.jsmediatagsLoad(jsmediatagsPromise)
            this.doRecomputeMixPoint()
        },

        loadedmetadataHandler() {
            return new Promise((resolve, reject) => {
                this.audio = new Audio(this.url)
                this.audio.addEventListener('loadedmetadata', resolve)
                this.audio.addEventListener('ended', () => this.pause())
            })
        },

        jsmediatagsHandler() {
            return new Promise((onSuccess, onError) => {
                new jsmediatags.read(this.file, { onSuccess, onError })
            })
        },

        async mixpointHandler() {
            return Promise.allSettled([
                new Promise(async (resolve, reject) => {
                    const audioStartWorker = new Worker('audio-start-worker.js')

                    try {
                        const arrayBuffer = await this.file.arrayBuffer()
                        const baseContext = new OfflineAudioContext(1, 48000, 48000)
                        const audioBufferStart = await baseContext.decodeAudioData(arrayBuffer)

                        const numChannels = audioBufferStart.numberOfChannels
                        const channels = [ ]
                        const transferables = [ ]
                        
                        for (let i = 0; i < numChannels; ++i) {
                            const channelData = audioBufferStart.getChannelData(i)
                            channels.push(channelData)
                            transferables.push(channelData.buffer)
                        }

                        audioStartWorker.onmessage = e => {
                            audioStartWorker.terminate()
                            resolve(e.data.timeInSeconds)
                        }
                        audioStartWorker.onerror = err => {
                            audioStartWorker.terminate()
                            reject(err)
                        }

                        audioStartWorker.postMessage({
                            channels,
                            sampleRate: audioBufferStart.sampleRate,
                            threshold: this.startThreshold,
                            windowSize: this.startWindowSize
                        }, transferables)
                    } catch (error) {
                        audioStartWorker.terminate()
                        reject(error)
                    }
                }),
                new Promise(async (resolve, reject) => {
                    const audioEndWorker = new Worker('audio-end-worker.js')

                    try {
                        const arrayBuffer = await this.file.arrayBuffer()
                        const baseContext = new OfflineAudioContext(1, 48000, 48000)
                        const audioBufferEnd = await baseContext.decodeAudioData(arrayBuffer)
                        
                        const numChannels = audioBufferEnd.numberOfChannels
                        const channels = [ ]
                        const transferables = [ ]
                        
                        for (let i = 0; i < numChannels; ++i) {
                            const channelData = audioBufferEnd.getChannelData(i)
                            channels.push(channelData)
                            transferables.push(channelData.buffer)
                        }

                        audioEndWorker.onmessage = e => {
                            audioEndWorker.terminate()
                            resolve(e.data.timeInSeconds)
                        }
                        audioEndWorker.onerror = err => {
                            audioEndWorker.terminate()
                            reject(err)
                        }

                        audioEndWorker.postMessage({
                            channels,
                            sampleRate: audioBufferEnd.sampleRate,
                            threshold: this.endThreshold,
                            windowSize: this.endWindowSize
                        }, transferables)
                    } catch (error) {
                        audioEndWorker.terminate()
                        reject(error)
                    }
                })
            ])
        },

        async loadedmetadataLoad(promise) {
            if (promise.status === 'fulfilled') {
                const arrayBuffer = await this.file.arrayBuffer()
                const baseContext = new OfflineAudioContext(1, 48000, 48000)
                const audioBuffer = await baseContext.decodeAudioData(arrayBuffer)
                const duration = audioBuffer.duration
                const minutes = Math.floor(duration / 60)
                const deciseconds = Math.floor(duration * 10) % 600
                const hrMinutes = String(minutes)
                const hrSeconds = String(deciseconds).padStart(3, '0').replace(/(\d)$/, '.$1')
                this.duration = duration
                this.hrDuration = `${hrMinutes}:${hrSeconds}`
            }
        },

        jsmediatagsLoad(promise) {
            if (promise.status === 'fulfilled') {
                this.metadata = promise.value
            }
        },

        mixpointLoad(startPromise, endPromise) {
            if (startPromise.status === 'fulfilled') {
                this.startPoint = startPromise.value
            }
            if (endPromise.status === 'fulfilled') {
                this.mixPoint = endPromise.value
                const relativeValue = this.duration - endPromise.value
                const deciseconds = Math.floor(relativeValue * 10)
                const hrSeconds = String(deciseconds).padStart(2, '0').replace(/(\d)$/, '.$1')
                this.hrMixPoint = `-${hrSeconds}`.padStart(5, ' ')
            }
        },

        play() {
            this.playing = true
            this.nextTriggered = false
            this.audio.currentTime = this.startPoint || 0
            this.audio.play()
            this.routine()
        },

        pause() {
            cancelAnimationFrame(this.rafInstance)
            this.audio.pause()
            this.currentTime = '--:--.-'
            this.playing = false
        },

        jumpToEnd() {
            this.audio.currentTime = this.mixPoint - 5
        },

        routine() {
            const currentTime = this.audio.currentTime
            if (currentTime >= this.mixPoint && !(this.nextTriggered)) {
                this.nextTriggered = true
                this.$emit('next')
            }

            const minutes = Math.floor(currentTime / 60)
            const deciseconds = Math.floor(currentTime * 10) % 600
            const hrMinutes = String(minutes)
            const hrSeconds = String(deciseconds).padStart(3, '0').replace(/(\d)$/, '.$1')
            this.currentTime = `${hrMinutes}:${hrSeconds}`

            this.rafInstance = requestAnimationFrame(() => this.routine())
        },

        async doRecomputeMixPoint() {
            try {
                this.hrMixPoint = '---.-'
                const [ startPromise, endPromise ] = await this.mixpointHandler()
                this.mixpointLoad(startPromise, endPromise)
                this.$forceUpdate()
            } catch (error) {
                console.error(error)
            }
        }
    },

    beforeMount() {
        this.load()
    }
}