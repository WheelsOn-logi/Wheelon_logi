const axios = require('axios');

const apiKey = 'ALbCgtIvfsg5oXZQ4S6TtxEuX7VtAzo016dy7GlHZKlMlvR35RUkdxDCuxRxh6Wo'; // Replace with your actual MongoDB Atlas Data API key
const endpoint = 'https://ap-south-1.aws.data.mongodb-api.com/app/data-ffiqjii/endpoint/data/v1'; // Replace with your actual Data API endpoint
const dataSource = 'lokesh25'; // Replace with your actual cluster name
const database = 'lokesh25';
const collection = 'won';

async function getCoordinates(pincode) {
    try {
        const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
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

async function fetchSuppliers(distanceRange) {
    try {
        const response = await axios.post(`${endpoint}/action/find`, {
            dataSource,
            database,
            collection,
            filter: { distance_range: distanceRange }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            }
        });

        return response.data.documents;
    } catch (error) {
        console.error('Error fetching suppliers:', error.message);
        throw new Error('Error fetching suppliers: ' + error.message);
    }
}

async function calculate(req, res) {
    const { fromPincode, toPincode, weight, length, width, height, numItems } = req.body;

    try {
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

        const suppliers = await fetchSuppliers(distanceRange);

        const result = suppliers.map(row => ({
            supplierName: row.supplier_name,
            distance,
            absoluteWeight,
            volumetricWeight,
            finalWeight,
            calculatedPrice: row[priceColumn] * finalWeight,
            tat: row.tat
        }));

        res.json(result);
    } catch (err) {
        console.error('Error calculating price:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { calculate };
