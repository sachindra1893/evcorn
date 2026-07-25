const body = {
    name: "TestCar::Variant1",
    categoryId: "tata",
    price: "10 Lakh",
    batteryCapacity: "Test Battery"
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
    
    // Now try to update it using POST with the same ID
    const updateBody = {
        ...created,
        batteryCapacity: "Test Battery Updated"
    };
    
    const updateRes = await fetch(`https://evcorn-backend.onrender.com/api/vehicles`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': 'admin'
        },
        body: JSON.stringify(updateBody)
    });
    
    const updated = await updateRes.json();
    console.log("Updated via POST:", updated);
    
    // Clean up
    await fetch(`https://evcorn-backend.onrender.com/api/vehicles/${created.id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-password': 'admin' }
    });
});
