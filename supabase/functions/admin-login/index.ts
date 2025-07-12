Deno.serve(() => {
  return new Response(JSON.stringify({ 
    message: "Admin login function is working",
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});