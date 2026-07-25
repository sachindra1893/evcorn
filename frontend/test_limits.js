const longString = "A".repeat(500);
const body = {
    name: "TestCar::Limits",
    categoryId: "tata",
    price: "10 Lakh",
    batteryCapacity: longString,
    seating: longString,
    dimensions: longString,
    groundClearance: longString,
    tyreSize: longString,
    bootFrunkSpace: longString,
    bhpTorque: longString,
    drivetrain: longString,
    safetyRating: longString
};

fetch('https://evcorn-backend.onrender.com/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': 'admin' },
    body: JSON.stringify(body)
}).then(r => r.json()).then(async created => {
    console.log("Created keys lengths:");
    for (const key of Object.keys(created)) {
        console.log(key, typeof created[key] === 'string' ? created[key].length : 'N/A');
    }
    
    // Clean up
    await fetch(`https://evcorn-backend.onrender.com/api/vehicles/${created.id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-password': 'admin' }
    });
});
