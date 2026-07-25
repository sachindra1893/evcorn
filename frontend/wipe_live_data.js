const https = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function wipeLiveVehicles() {
  console.log('Fetching live vehicles...');
  try {
    const res = await makeRequest({
      hostname: 'evcorn-backend.onrender.com',
      path: '/api/vehicles',
      method: 'GET'
    });
    
    if (res.statusCode !== 200) {
      throw new Error(`Failed to fetch vehicles: ${res.statusCode} ${res.data}`);
    }
    
    const vehicles = JSON.parse(res.data);
    console.log(`Found ${vehicles.length} vehicles to delete.`);
    
    for (const v of vehicles) {
      console.log(`Deleting ${v.id}...`);
      const delRes = await makeRequest({
        hostname: 'evcorn-backend.onrender.com',
        path: `/api/vehicles/${v.id}`,
        method: 'DELETE',
        headers: {
          'x-admin-password': 'admin'
        }
      });
      if (delRes.statusCode !== 200) {
        console.error(`Failed to delete ${v.id}: ${delRes.statusCode} ${delRes.data}`);
      } else {
        console.log(`Deleted ${v.id}`);
      }
    }
    console.log('Finished wiping all live vehicles.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

wipeLiveVehicles();
