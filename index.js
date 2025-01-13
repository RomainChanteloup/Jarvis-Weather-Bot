import { config } from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import https from 'https';

config(); // Charge les variables d'environnement

// Configuration
const WEATHER_CONFIG = {
    latitude: 43.297,
    longitude: 5.3811,
    baseUrl: 'https://api.open-meteo.com/v1/forecast'
};

// Fonction pour construire l'URL de l'API météo
function buildWeatherUrl() {
    return `${WEATHER_CONFIG.baseUrl}?latitude=${WEATHER_CONFIG.latitude}&longitude=${WEATHER_CONFIG.longitude}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=16`;
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

// Fonction pour extraire la température de demain
function getTomorrowTemperature(weatherData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const timeIndex = weatherData.hourly.time.findIndex(time => time.startsWith(tomorrowDate));
    if (timeIndex === -1) return null;

    // Calcul de la moyenne des températures pour demain
    const temperatures = weatherData.hourly.temperature_2m.slice(timeIndex, timeIndex + 24);
    const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    
    return avgTemp.toFixed(1);
}

// Fonction pour formater le message météo
function formatWeatherMessage(temperature) {
    return `🌡️ La température moyenne à Marseille demain sera de ${temperature}°C`;
}

// Configuration du client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Fonction pour envoyer un message dans le canal
async function sendMessageToChannel(channel, message) {
    try {
        await channel.send(message);
        console.log('Message envoyé avec succès');
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
}

// Fonction principale qui combine tout
async function sendWeatherUpdate(channel) {
    try {
        const weatherData = await fetchWeatherData();
        const temperature = getTomorrowTemperature(weatherData);
        if (temperature) {
            const message = formatWeatherMessage(temperature);
            await sendMessageToChannel(channel, message);
        }
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
    } else {
        console.error('Canal dev non trouvé');
    }
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);