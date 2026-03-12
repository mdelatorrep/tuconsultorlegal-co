import { useEffect } from 'react';

export default function GoogleCalendarCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && window.opener) {
      window.opener.postMessage({
        type: 'google-calendar-callback',
        code: code,
      }, window.location.origin);
    } else {
      // If opened directly (not as popup), show a message
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><p>Puedes cerrar esta ventana.</p></div>';
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Conectando con Google Calendar... Puedes cerrar esta ventana.</p>
    </div>
  );
}
