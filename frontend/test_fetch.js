fetch('https://evcorn-backend.onrender.com/api/vehicles').then(r => r.json()).then(data => {
    const encoded = data.filter(d => d.batteryCapacity && d.batteryCapacity.includes('||'));
    console.log(`Found ${encoded.length} encoded vehicles.`);
    if (encoded.length > 0) {
        encoded.forEach(c => {
            const parts = c.batteryCapacity.split('||');
            console.log("Name:", c.name);
            console.log("Parts:", parts.length);
            if (parts.length > 4) {
                console.log("Range:", parts[4]);
            }
        });
    }
});
