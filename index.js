import { config } from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import https from 'https';
import { generateCharts } from './graph_gen.js';

config(); // Charge les variables d'environnement

// Configuration
const WEATHER_CONFIG = {
    latitude: 43.297,
    longitude: 5.3811,
    baseUrl: 'https://api.open-meteo.com/v1/forecast'
};

// Fonction pour construire l'URL de l'API météo
// A modifié comme vous le souhaitez
function buildWeatherUrl() {
    return `${WEATHER_CONFIG.baseUrl}?latitude=${WEATHER_CONFIG.latitude}&longitude=${WEATHER_CONFIG.longitude}`+
    '&hourly=temperature_2m,precipitation_probability,wind_speed_10m&start_date=2025-02-01&end_date=2025-02-03';
}

// Fonction pour récupérer les données météo
async function fetchWeatherData() {
    return new Promise((resolve, reject) => {
        https.get(buildWeatherUrl(), (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(new Error(`Erreur parsing JSON: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Erreur HTTP: ${error.message}`));
        });
    });
}

// Configuration du client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Fonction pour envoyer un message dans le canal
async function sendMessageToChannel(channel, weatherData) {
    try {
        const buffer = await generateCharts(weatherData);
        console.log('Envoit du graphique dans le channel');
        // envoit du message avec le graphique
        await channel.send('Voici les prévisions météo pour les 16 prochains jours 🌅:', { files: [buffer] });
        console.log('Message envoyé avec succès');
        await channel.send( { files: [buffer] })
        console.log('Image envoyée avec succès');
        return;
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
}

// Fonction principale qui combine tout
async function sendWeatherUpdate(channel) {
    try {
        const weatherData = await fetchWeatherData();
        return await sendMessageToChannel(channel, weatherData);
    } catch (error) {
        console.error('Erreur weather update:', error);
    }
}

// Event handler quand le bot est prêt
client.on(Events.ClientReady, async (readyClient) => {
    console.log(`Connecté en tant que ${readyClient.user.tag}`);
    
    const devChannel = readyClient.channels.cache.find(channel => channel.name === 'dev');
    if (devChannel) {
        await sendWeatherUpdate(devChannel);
        client.destroy();
        return;
    } else {
        console.error('Canal dev non trouvé');
        client.destroy();
        return;
    }
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);