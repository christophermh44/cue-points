import { createApp } from './vue.js'
import CuePointsApp from './CuePointsApp.js'

const app = createApp(CuePointsApp)
app.mount('[data-app]')