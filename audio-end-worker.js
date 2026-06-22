// audio-end-worker.js
self.onmessage = function (e) {
    const { channels, sampleRate, threshold, windowSize = 1000 } = e.data;
    
    const numChannels = channels.length;
    const totalSamples = channels[0].length;

    // Taille de la fenêtre glissante en échantillons
    const windowSamples = Math.floor((windowSize / 1000) * sampleRate);

    // Conversion du seuil dB en valeur linéaire RMS
    const rmsThreshold = Math.pow(10, threshold / 20);
    const rmsThresholdSquared = rmsThreshold * rmsThreshold; // On compare les carrés pour éviter Math.sqrt dans la boucle
    
    let detectedSampleIndex = -1;

    // On pré-alloue des tableaux pour stocker les derniers carrés de chaque canal
    // pour pouvoir les soustraire facilement quand ils sortent de la fenêtre glissante
    const history = new Float32Array(windowSamples * numChannels);
    let historyIndex = 0;

    let currentWindowSumOfSquares = 0;
    let filledSamples = 0;

    // Boucle principale : on remonte le temps échantillon par échantillon
    for (let i = totalSamples - 1; i >= 0; i--) {
        
        // 1. Calcul de la somme des carrés pour l'échantillon courant 'i' à travers tous les canaux
        let instantSumOfSquares = 0;
        for (let c = 0; c < numChannels; c++) {
            const sample = channels[c][i];
            instantSumOfSquares += sample * sample;
        }
        // Moyenne instantanée pour cet échantillon à travers les N canaux
        const instantPower = instantSumOfSquares / numChannels;

        // 2. Gestion de la fenêtre glissante (FIFO)
        const historyPosition = historyIndex * numChannels;
        
        // On récupère la valeur qui va sortir de la fenêtre à l'autre bout
        const outgoingPower = history[historyPosition];
        
        // On remplace par la nouvelle valeur entrante
        history[historyPosition] = instantPower;
        
        // Mise à jour circulaire de l'index de l'historique
        historyIndex = (historyIndex + 1) % windowSamples;

        // 3. Mise à jour de la somme globale de la fenêtre
        currentWindowSumOfSquares += instantPower - outgoingPower;

        if (filledSamples < windowSamples) {
            filledSamples++;
        }

        // 4. Calcul de la puissance moyenne de la fenêtre courante
        const currentWindowPower = currentWindowSumOfSquares / filledSamples;

        // 5. Comparaison avec le seuil (on compare au carré pour optimiser les performances)
        if (currentWindowPower >= rmsThresholdSquared && filledSamples >= windowSamples) {
            // On a trouvé le moment précis où la fenêtre glissante accumule assez d'énergie
            detectedSampleIndex = i;
            break;
        }
    }

    // Calcul du temps final
    // Comme la fenêtre glisse vers la gauche (en remontant), le point de bascule 
    // correspond à l'échantillon détecté ajusté de la taille de la fenêtre.
    let timeInSeconds;
    if (detectedSampleIndex !== -1) {
        timeInSeconds = (detectedSampleIndex + windowSamples) / sampleRate;
    } else {
        timeInSeconds = totalSamples / sampleRate;
    }

    self.postMessage({ timeInSeconds });
};