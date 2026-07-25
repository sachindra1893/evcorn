fetch('https://evcorn-backend.onrender.com/api/vehicles').then(r => r.json()).then(data => {
    const encoded = data.filter(d => d.batteryCapacity && d.batteryCapacity.includes('||'));
    console.log(`Found ${encoded.length} encoded vehicles.`);
    if (encoded.length > 0) console.log(JSON.stringify(encoded[0].batteryCapacity.substring(0, 50)));
});
