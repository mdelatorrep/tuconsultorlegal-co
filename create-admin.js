// Utility para crear el admin user inicial
(async () => {
  const response = await fetch('https://tkaezookvtpulfpaffes.supabase.co/functions/v1/create-admin-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE'
    },
    body: JSON.stringify({
      email: 'manuel@tuconsultorlegal.co',
      password: 'Admin123!',
      fullName: 'Manuel - Super Administrador',
      isSuperAdmin: true
    })
  });
  
  const result = await response.json();
  console.log('Admin creation result:', result);
})();