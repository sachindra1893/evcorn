const body = {
    name: "TestCar::Variant2",
    categoryId: "tata",
    price: "10 Lakh",
    batteryCapacity: "Test Battery||11 kW||150 kW||N/A||500 km||High",
    range: "500" // SENDING RANGE EXPLICITLY!
};

fetch('https://evcorn-backend.onrender.com/api/vehicles', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': 'admin'
    },
    body: JSON.stringify(body)
}).then(r => r.json()).then(async created => {
    console.log("Created:", created);
    
    // Clean up
    await fetch(`https://evcorn-backend.onrender.com/api/vehicles/${created.id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-password': 'admin' }
    });
});
