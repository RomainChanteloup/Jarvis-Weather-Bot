import { createCanvas, loadImage } from 'canvas';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { readFile, writeFile } from 'fs/promises';

const singleWidth = 1200; // Largeur pour chaque graphique
const singleHeight = 400; // Hauteur pour chaque graphique
const totalHeight = singleHeight * 3; // Hauteur totale pour les 3 graphiques

// Configuration de Chart.js
const chartCallback = (ChartJS) => {
    ChartJS.defaults.font.family = 'Arial';
};

const backgroundColour = 'white';
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: singleWidth,
    height: singleHeight,
    backgroundColour,
    chartCallback
});

// Fonction pour filtrer les dates et n'afficher que les jours uniques
// Fonction pour inclure l'heure dans les étiquettes de date
function getUniqueDays(timestamps) {
    return timestamps.map(timestamp =>
        new Date(timestamp).toLocaleString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    );
}

async function generateChart(label, data, color, yTitle, uniqueDays) {
    const configuration = {
        type: 'line',
        data: {
            labels: uniqueDays,
            datasets: [
                {
                    label: label,
                    data: data,
                    borderColor: color,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            plugins: {
                legend: {
                    display: false // Pas besoin de légende pour chaque graphique
                },
                title: {
                    display: true,
                    text: yTitle
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yTitle
                    }
                }
            }
        }
    };

    // Générer un graphique en buffer
    return chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
}

export async function generateCharts(weatherData) {
    try {
        // Charger les données en parametre ou le fichier JSON
        const jsonData = weatherData //JSON.parse(await readFile('testdata.json', 'utf-8'));

        // Extraction et transformation des données
        const uniqueDays = getUniqueDays(jsonData.hourly.time);
        const temperatureData = jsonData.hourly.temperature_2m;
        const precipitationData = jsonData.hourly.precipitation_probability;
        const windSpeedData = jsonData.hourly.wind_speed_10m;

        // Fonction pour générer un graphique pour une série donnée

        // Génération des trois graphiques
        const tempChart = await generateChart(
            'Température (°C)',
            temperatureData,
            'rgb(255, 99, 132)',
            'Température (°C)',
            uniqueDays
        );
        const precipChart = await generateChart(
            'Précipitations (%)',
            precipitationData,
            'rgb(54, 162, 235)',
            'Probabilité de Précipitations (%)',
            uniqueDays
        );
        const windChart = await generateChart(
            'Vent (km/h)',
            windSpeedData,
            'rgb(75, 192, 192)',
            'Vitesse du Vent (km/h)',
            uniqueDays
        );

        // Combinaison des trois graphiques sur un seul canvas
        const finalCanvas = createCanvas(singleWidth, totalHeight);
        const ctx = finalCanvas.getContext('2d');

        // Charger et dessiner chaque graphique sur le canvas final
        const tempImage = await loadImage(tempChart);
        const precipImage = await loadImage(precipChart);
        const windImage = await loadImage(windChart);

        ctx.drawImage(tempImage, 0, 0, singleWidth, singleHeight); // Température
        ctx.drawImage(precipImage, 0, singleHeight, singleWidth, singleHeight); // Précipitations
        ctx.drawImage(windImage, 0, singleHeight * 2, singleWidth, singleHeight); // Vent

        // Sauvegarde du canvas final
        const buffer = finalCanvas.toBuffer('image/png');
        console.log('Graphiques combinés dans le buffer');
        return buffer;
        // await writeFile('merged_graphics.png', buffer); // Sauvegarde du fichier de l'image pour debug
        
    } catch (error) {
        console.error('Erreur lors de la génération des graphiques :', error);
    }
};
