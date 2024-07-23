const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(bodyParser.json());

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'"],
            "img-src": ["'self'", "data:"]
        }
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

const uri = "mongodb+srv://wheelson1234:As8ikDp8L06voJa0@lokesh25.ql7a7yq.mongodb.net/?retryWrites=true&w=majority&appName=lokesh25";

app.post('/calculate', async (req, res) => {
    const { fromPincode, toPincode, weight, length, width, height, numItems } = req.body;

    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        const coords1 = await getCoordinates(fromPincode);
        const coords2 = await getCoordinates(toPincode);
        const distance = haversineDistance(coords1, coords2) + 20;

        const absoluteWeight = weight * numItems;
        const volumetricWeight = ((length * height * width) / 1728) * numItems;
        const finalWeight = Math.max(absoluteWeight, volumetricWeight);

        let distanceRange = '';
        if (distance <= 100) {
            distanceRange = '0-100';
        } else if (distance <= 200) {
            distanceRange = '101-200';
        } else if (distance <= 300) {
            distanceRange = '201-300';
        } else if (distance <= 400) {
            distanceRange = '301-400';
        } else if (distance <= 500) {
            distanceRange = '401-500';
        } else {
            distanceRange = '500+';
        }

        let priceColumn = '';
        if (finalWeight <= 100) {
            priceColumn = 'price_per_kg_0_100';
        } else if (finalWeight <= 300) {
            priceColumn = 'price_per_kg_100_300';
        } else if (finalWeight <= 500) {
            priceColumn = 'price_per_kg_300_500';
        } else if (finalWeight <= 1000) {
            priceColumn = 'price_per_kg_500_1000';
        } else {
            priceColumn = 'price_per_kg_1000_plus';
        }

        const db = client.db("lokesh25");
        const collection = db.collection('won');

        const query = { distance_range: distanceRange };
        const projection = { supplier_name: 1, [priceColumn]: 1, tat: 1 };

        const rows = await collection.find(query).project(projection).toArray();

        const suppliers = rows.map(row => ({
            supplierName: row.supplier_name,
            distance,
            absoluteWeight,
            volumetricWeight,
            finalWeight,
            calculatedPrice: row[priceColumn] * finalWeight,
            tat: row.tat
        }));

        res.json(suppliers);
    } catch (err) {
        console.error('Error calculating price:', err);
        res.status(500).json({ error: err.message });
    } finally {
        await client.close();
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('Visit http://localhost:3000');
});

async function getCoordinates(pincode) {
    try {
        const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
            params: {
                q: pincode,
                key: '593d3c5fc767421ba4726516486edda0' // Replace with your OpenCage API key
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry;
            return { latitude: lat, longitude: lng };
        } else {
            throw new Error('Invalid postcode');
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error.message);
        throw new Error('Error fetching coordinates: ' + error.message);
    }
}

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}
